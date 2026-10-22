#!/usr/bin/env python3
"""Aggregate externally accepted attempts; never run tasks or judge code."""
import argparse
import csv
from decimal import Decimal, InvalidOperation, ROUND_HALF_EVEN, localcontext
import json
import re

FIELDS = (
    'configuration,task_id,attempt,acceptance_id,accepted,billed_cost,currency,'
    'input_uncached_tokens,input_cached_tokens,output_tokens,wall_seconds,'
    'human_review_minutes,human_fix_minutes,stop_reason,notes'
).split(',')
TOKEN_FIELDS = ('input_uncached_tokens', 'input_cached_tokens', 'output_tokens')
TIME_FIELDS = ('wall_seconds', 'human_review_minutes', 'human_fix_minutes')
MAX_DECIMAL_TEXT = 2048
MAX_DECIMAL_DIGITS = 1000
MAX_DECIMAL_EXPONENT = 1000


def read_csv(path, required):
    """Reject empty, duplicate-header and ragged inputs before aggregation."""
    with open(path, encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream, strict=True)
        headers = reader.fieldnames
        if (not headers or len(set(headers)) != len(headers)
                or not set(required).issubset(headers)):
            raise ValueError(f'{path}: missing or duplicate CSV headers')
        rows = []
        for record in reader:
            if None in record or any(value is None for value in record.values()):
                raise ValueError(f'{path}:{reader.line_num}: wrong number of columns')
            rows.append(record)
    if not rows:
        raise ValueError(f'{path}: no data rows; cannot infer an evaluation configuration')
    return rows


def required_text(value, field):
    if not value or value != value.strip():
        raise ValueError(f'{field}: required nonblank value without surrounding whitespace')
    return value


def unsigned_integer(value, field, positive=False):
    pattern = r'[1-9][0-9]*' if positive else r'(0|[1-9][0-9]*)'
    if not re.fullmatch(pattern, value):
        raise ValueError(f'{field}: expected {"positive" if positive else "nonnegative"} integer')
    return int(value)


def nonnegative_decimal(value, field):
    if not value or value != value.strip():
        raise ValueError(f'{field}: a numeric value is required (use 0 only if known zero)')
    if len(value) > MAX_DECIMAL_TEXT:
        raise ValueError(f'{field}: numeric text exceeds {MAX_DECIMAL_TEXT} characters')
    try:
        number = Decimal(value)
    except InvalidOperation as error:
        raise ValueError(f'{field}: invalid decimal') from error
    if not number.is_finite() or number < 0:
        raise ValueError(f'{field}: expected finite nonnegative decimal')
    parts = number.as_tuple()
    exponent = parts.exponent
    if (len(parts.digits) > MAX_DECIMAL_DIGITS or not isinstance(exponent, int)
            or not -MAX_DECIMAL_EXPONENT <= exponent <= MAX_DECIMAL_EXPONENT
            or number.adjusted() > MAX_DECIMAL_EXPONENT):
        raise ValueError(f'{field}: outside supported decimal range '
                         '(at most 1000 coefficient digits, exponent -1000..1000, adjusted exponent <=1000)')
    return number


def exact_sum(values):
    """Size decimal precision to the operands so totals are not rounded."""
    values = list(values)
    if not values:
        return Decimal(0)
    with localcontext() as context:
        context.prec = max(50, max(v.adjusted() for v in values)
                           - min(v.as_tuple().exponent for v in values)
                           + len(str(len(values))) + 2)
        return sum(values, Decimal(0))


def unit_cost(total, count):
    """Ratios use at least 50 significant digits, not currency-cent rounding."""
    with localcontext() as context:
        context.prec = max(50, len(total.as_tuple().digits) + len(str(count)) + 2)
        context.rounding = ROUND_HALF_EVEN
        return str(total / count)


def summarize(tasks_path, attempts_path):
    """Return JSON-ready data. The manifest, not attempted rows, is the plan."""
    tasks = {}
    for record in read_csv(tasks_path, ('task_id', 'acceptance_id')):
        task = required_text(record['task_id'], 'manifest task_id')
        acceptance = required_text(record['acceptance_id'], 'manifest acceptance_id')
        if task in tasks:
            raise ValueError(f'manifest: duplicate task_id {task!r}')
        tasks[task] = acceptance

    groups = {}
    seen = set()
    currencies = {}
    for line, record in enumerate(read_csv(attempts_path, FIELDS), 2):
        label = f'attempts row {line}'
        configuration = required_text(record['configuration'], f'{label} configuration')
        task = record['task_id']
        if task not in tasks:
            raise ValueError(f'{label}: task_id {task!r} not in manifest')
        if record['acceptance_id'] != tasks[task]:
            raise ValueError(f'{label}: acceptance_id does not match frozen manifest')
        record['attempt'] = unsigned_integer(record['attempt'], f'{label} attempt', positive=True)
        key = (configuration, task, record['attempt'])
        if key in seen:
            raise ValueError(f'{label}: duplicate (configuration, task_id, attempt) {key!r}')
        seen.add(key)
        if record['accepted'] not in ('true', 'false'):
            raise ValueError(f'{label}: accepted must be exactly true or false')
        currency = required_text(record['currency'], f'{label} currency')
        if configuration in currencies and currencies[configuration] != currency:
            raise ValueError(f'{label}: mixed currency within configuration {configuration!r}')
        currencies[configuration] = currency
        record['billed_cost'] = (None if record['billed_cost'] == '' else
                                 nonnegative_decimal(record['billed_cost'], f'{label} billed_cost'))
        for field in TOKEN_FIELDS:
            record[field] = unsigned_integer(record[field], f'{label} {field}')
        for field in TIME_FIELDS:
            record[field] = nonnegative_decimal(record[field], f'{label} {field}')
        groups.setdefault(configuration, []).append(record)

    reports = []
    for configuration, attempts in sorted(groups.items()):
        observed = {r['task_id'] for r in attempts}
        accepted = {r['task_id'] for r in attempts if r['accepted'] == 'true'}
        first = {r['task_id'] for r in attempts
                 if r['accepted'] == 'true' and r['attempt'] == 1}
        missing = sum(r['billed_cost'] is None for r in attempts)
        known = exact_sum(r['billed_cost'] for r in attempts if r['billed_cost'] is not None)
        complete = observed == set(tasks)
        report = {
            'configuration': configuration,
            'currency': currencies[configuration],
            'status': 'complete' if complete else 'incomplete',
            'planned_tasks': len(tasks),
            'observed_tasks': len(observed),
            'not_attempted': sorted(set(tasks) - observed),
            'attempts': len(attempts),
            'unique_accepted_tasks': len(accepted),
            'first_attempt_successful_tasks': len(first),
            'known_cost_subtotal': str(known),
            'missing_cost_count': missing,
            'total_cost': None if missing else str(known),
            'cost_per_accepted_task': (unit_cost(known, len(accepted))
                                       if accepted and complete and not missing else None),
        }
        for field in TOKEN_FIELDS:
            report[field] = sum(r[field] for r in attempts)
        for field in TIME_FIELDS:
            key = 'cumulative_attempt_duration_seconds' if field == 'wall_seconds' else field
            report[key] = str(exact_sum(r[field] for r in attempts))
        reports.append(report)
    return {'configurations': reports}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tasks', required=True)
    parser.add_argument('--attempts', required=True)
    args = parser.parse_args()
    try:
        result = summarize(args.tasks, args.attempts)
    except (ValueError, OSError, ArithmeticError, csv.Error) as error:
        parser.exit(2, f'error: {error}\n')
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
