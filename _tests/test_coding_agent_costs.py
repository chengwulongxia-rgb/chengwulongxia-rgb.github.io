"""Stdlib-only tests; all fixture figures are illustrative, not model results."""
import csv
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'assets/examples/coding-agent-evaluation/summarize.py'
FIELDS: tuple[str, ...] = tuple('configuration,task_id,attempt,acceptance_id,accepted,billed_cost,currency,input_uncached_tokens,input_cached_tokens,output_tokens,wall_seconds,human_review_minutes,human_fix_minutes,stop_reason,notes'.split(','))
TASKS = 'task_id,acceptance_id\ntask001,accept001\ntask002,accept002\ntask003,accept003\n'

def row(task, attempt, accepted, cost) -> dict[str, str]:
    return dict(zip(FIELDS, ['demo', task, str(attempt), 'accept' + task[-3:], accepted, cost, 'USD', '100', '20', '30', '60', '2', '1', 'completed', '示意數據，不是任何模型實測']))

def demo_rows():
    return [row('task001', 1, 'false', '0.06'), row('task001', 2, 'true', '0.04'), row('task002', 1, 'false', '0.10'), row('task003', 1, 'true', '0.20')]

class CostTests(unittest.TestCase):
    def run_cli(self, rows=None, tasks=TASKS, attempts_text=None):
        if attempts_text is None:
            text = io.StringIO()
            writer = csv.DictWriter(text, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(demo_rows() if rows is None else rows)
            attempts_text = text.getvalue()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / 'tasks.csv').write_text(tasks, encoding='utf-8')
            (path / 'attempts.csv').write_text(attempts_text, encoding='utf-8')
            return subprocess.run([sys.executable, '-B', str(SCRIPT), '--tasks', str(path / 'tasks.csv'), '--attempts', str(path / 'attempts.csv')], text=True, capture_output=True)

    def result(self, rows=None, **kwargs):
        proc = self.run_cli(rows, **kwargs)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return json.loads(proc.stdout)['configurations'][0]

    def test_total_includes_failed_attempts_not_only_accepted_rows(self):
        result = self.result()
        self.assertEqual(result['known_cost_subtotal'], '0.40')
        self.assertEqual(result['total_cost'], '0.40')
        self.assertEqual(result['cost_per_accepted_task'], '0.20')
        self.assertNotEqual(result['cost_per_accepted_task'], '0.12')
        self.assertEqual(result['planned_tasks'], 3)
        self.assertEqual(result['attempts'], 4)
        self.assertEqual(result['unique_accepted_tasks'], 2)
        self.assertEqual(result['first_attempt_successful_tasks'], 1)
        self.assertEqual(result['cumulative_attempt_duration_seconds'], '240')
        self.assertEqual(result['human_review_minutes'], '8')
        self.assertEqual(result['human_fix_minutes'], '4')
        self.assertEqual(result['input_uncached_tokens'], 400)

    def assert_invalid(self, rows=None, **kwargs):
        proc = self.run_cli(rows, **kwargs)
        self.assertEqual(proc.returncode, 2, proc.stdout + proc.stderr)
        self.assertEqual(proc.stdout, '')
        self.assertIn('error:', proc.stderr)
        self.assertNotIn('Traceback', proc.stderr)

    def test_retry_and_repeated_acceptance_do_not_inflate_unique_tasks(self):
        rows = demo_rows() + [row('task001', 3, 'true', '0.10')]
        result = self.result(rows)
        self.assertEqual(result['unique_accepted_tasks'], 2)
        self.assertEqual(result['first_attempt_successful_tasks'], 1)
        self.assertEqual(result['total_cost'], '0.50')
        self.assertEqual(result['cost_per_accepted_task'], '0.25')

    def test_missing_task_does_not_shrink_manifest_denominator(self):
        result = self.result(demo_rows()[:2])
        self.assertEqual(result['planned_tasks'], 3)
        self.assertEqual(result['observed_tasks'], 1)
        self.assertEqual(result['not_attempted'], ['task002', 'task003'])
        self.assertEqual(result['status'], 'incomplete')
        self.assertIsNone(result['cost_per_accepted_task'])

    def test_blank_cost_is_unknown_not_zero(self):
        rows = demo_rows()
        rows[0]['billed_cost'] = ''
        result = self.result(rows)
        self.assertEqual(result['known_cost_subtotal'], '0.34')
        self.assertEqual(result['missing_cost_count'], 1)
        self.assertIsNone(result['total_cost'])
        self.assertIsNone(result['cost_per_accepted_task'])

    def test_zero_success_has_null_unit_cost(self):
        rows = demo_rows()
        for record in rows:
            record['accepted'] = 'false'
        result = self.result(rows)
        self.assertEqual(result['unique_accepted_tasks'], 0)
        self.assertIsNone(result['cost_per_accepted_task'])
        self.assertEqual(result['total_cost'], '0.40')

    def test_duplicate_attempt_is_rejected(self):
        self.assert_invalid(demo_rows() + [demo_rows()[0]])

    def test_negative_nan_and_infinite_numbers_are_rejected(self):
        for field in ['billed_cost', *FIELDS[7:13]]:
            for value in ['-1', 'NaN', 'Inf', '-Infinity']:
                with self.subTest(field=field, value=value):
                    rows = demo_rows()
                    rows[0][field] = value
                    self.assert_invalid(rows)

    def test_only_exact_true_false_are_accepted(self):
        for value in ['', 'TRUE', 'False', '1', 'yes', ' true ']:
            with self.subTest(value=value):
                rows = demo_rows()
                rows[0]['accepted'] = value
                self.assert_invalid(rows)

    def test_bad_acceptance_id_is_rejected(self):
        rows = demo_rows()
        rows[0]['acceptance_id'] = 'unfrozen-check'
        self.assert_invalid(rows)

    def test_unknown_task_is_rejected(self):
        rows = demo_rows()
        rows[0]['task_id'] = 'not-in-manifest'
        self.assert_invalid(rows)

    def test_mixed_currency_within_configuration_is_rejected(self):
        rows = demo_rows()
        rows[0]['currency'] = 'EUR'
        self.assert_invalid(rows)

    def test_separate_configurations_keep_costs_and_coverage_separate(self):
        rows = demo_rows()
        extra = row('task001', 1, 'true', '1.00')
        extra.update(configuration='other', currency='EUR')
        proc = self.run_cli(rows + [extra])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        reports = json.loads(proc.stdout)['configurations']
        self.assertEqual(len(reports), 2)
        self.assertEqual(reports[0]['total_cost'], '0.40')
        self.assertEqual(reports[1]['currency'], 'EUR')
        self.assertEqual(reports[1]['status'], 'incomplete')

    def test_empty_and_header_only_csv_are_rejected(self):
        for text in ['', ',\n', ','.join(FIELDS) + '\n']:
            with self.subTest(text=text):
                self.assert_invalid(attempts_text=text)
        for text in ['', 'task_id,acceptance_id\n']:
            with self.subTest(tasks=text):
                self.assert_invalid(tasks=text)

    def test_invalid_manifest_is_rejected(self):
        for text in ['task_id\ntask001\n', TASKS + 'task001,accept001\n', 'task_id,acceptance_id\ntask001,\n']:
            with self.subTest(text=text):
                self.assert_invalid(tasks=text)

    def test_attempts_require_positive_integer_and_numeric_identity_is_unique(self):
        for value in ['0', '-1', '1.5', 'NaN', '', '01', '1e1', '+1']:
            with self.subTest(value=value):
                rows = demo_rows()
                rows[0]['attempt'] = value
                self.assert_invalid(rows)

    def test_token_counts_require_unsigned_integer_strings(self):
        for field in FIELDS[7:10]:
            for value in ['1.5', '1.0', '1e2', '', '+1']:
                with self.subTest(field=field, value=value):
                    rows = demo_rows()
                    rows[0][field] = value
                    self.assert_invalid(rows)

    def test_required_times_cannot_be_blank(self):
        for field in FIELDS[10:13]:
            with self.subTest(field=field):
                rows = demo_rows()
                rows[0][field] = ''
                self.assert_invalid(rows)

    def test_blank_configuration_or_currency_is_rejected(self):
        for field in ['configuration', 'currency']:
            with self.subTest(field=field):
                rows = demo_rows()
                rows[0][field] = ''
                self.assert_invalid(rows)

    def test_malformed_csv_and_missing_columns_are_rejected(self):
        self.assert_invalid(attempts_text='configuration,task_id\ndemo,task001\n')
        text = io.StringIO()
        writer = csv.DictWriter(text, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(demo_rows())
        self.assert_invalid(attempts_text=text.getvalue() + 'extra,fields\n')
        self.assert_invalid(attempts_text=text.getvalue().replace('configuration,task_id', 'configuration,configuration', 1))
        self.assert_invalid(attempts_text=text.getvalue() + '"unterminated\n')

    def test_zero_cost_is_known(self):
        rows = demo_rows()
        for record in rows:
            record['billed_cost'] = '0'
        result = self.result(rows)
        self.assertEqual(result['total_cost'], '0')
        self.assertEqual(result['missing_cost_count'], 0)
        self.assertEqual(result['cost_per_accepted_task'], '0')

    def test_first_attempt_means_number_one_not_first_observed_row(self):
        result = self.result([row('task001', 2, 'true', '0.04')])
        self.assertEqual(result['first_attempt_successful_tasks'], 0)

    def test_extreme_small_nonzero_cost_is_not_silently_reported_as_zero(self):
        self.assert_invalid([row('task001', 1, 'true', '1e-1000100')],
                            tasks='task_id,acceptance_id\ntask001,accept001\n')

    def test_decimal_numeric_limits_reject_extremes_in_every_decimal_field(self):
        for field in ['billed_cost', *FIELDS[10:13]]:
            for value in ['1e-1001', '1e1001', '99e1000', '9' * 1001, '0' * 2049]:
                with self.subTest(field=field, value=value[:24]):
                    rows = demo_rows()
                    rows[0][field] = value
                    self.assert_invalid(rows)

    def test_supported_decimal_boundaries_keep_nonzero_contributions(self):
        from decimal import Decimal
        manifest = 'task_id,acceptance_id\ntask001,accept001\n'
        for value in ['1e-1000', '1e1000', '9' * 1000]:
            with self.subTest(value=value[:24]):
                report = self.result([row('task001', 1, 'true', value)], tasks=manifest)
                self.assertEqual(Decimal(report['total_cost']), Decimal(value))
                self.assertGreater(Decimal(report['cost_per_accepted_task']), 0)
        report = self.result([row('task001', 1, 'true', '1e1000'),
                              row('task001', 2, 'true', '1e-1000')], tasks=manifest)
        self.assertGreater(Decimal(report['total_cost']), Decimal('1e1000'))
        self.assertEqual(report['total_cost'], report['cost_per_accepted_task'])

    def test_decimal_totals_do_not_round_large_exact_amounts(self):
        rows = demo_rows()
        rows[0]['billed_cost'] = '123456789012345678901234567890123456789012345678901234567890.06'
        result = self.result(rows)
        self.assertEqual(result['total_cost'], '123456789012345678901234567890123456789012345678901234567890.40')

    def test_code_like_notes_are_inert_data(self):
        rows = demo_rows()
        rows[0]['notes'] = '__import__("sys").exit(99)'
        self.assertEqual(self.result(rows)['total_cost'], '0.40')

    def test_downloadable_demo_and_readme_exact_stdout_match(self):
        directory = SCRIPT.parent
        proc = subprocess.run([sys.executable, '-B', str(SCRIPT), '--tasks', str(directory / 'tasks-template.csv'), '--attempts', str(directory / 'illustrative-attempts.csv')], text=True, capture_output=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        report = json.loads(proc.stdout)['configurations'][0]
        self.assertEqual(report['total_cost'], '0.40')
        self.assertEqual(report['cost_per_accepted_task'], '0.20')
        readme = (directory / 'README.md').read_text(encoding='utf-8')
        self.assertIn('```json\n' + proc.stdout + '```', readme)
        with (directory / 'illustrative-attempts.csv').open(encoding='utf-8', newline='') as stream:
            for record in csv.DictReader(stream):
                self.assertIn('示意數據，不是任何模型實測', record['notes'])

    def test_public_demo_does_not_label_human_fixed_output_as_autonomous_success(self):
        with (SCRIPT.parent / 'illustrative-attempts.csv').open(encoding='utf-8', newline='') as stream:
            for record in csv.DictReader(stream):
                if record['accepted'] == 'true':
                    self.assertEqual(record['human_fix_minutes'], '0', 'The autonomous demo must not count human-fixed output as agent success')

    def test_attempt_template_is_header_only_and_not_a_fake_evaluation(self):
        directory = SCRIPT.parent
        with (directory / 'attempts-template.csv').open(encoding='utf-8', newline='') as stream:
            reader = csv.reader(stream)
            self.assertEqual(next(reader), list(FIELDS))
            self.assertEqual(list(reader), [])
        proc = subprocess.run([sys.executable, '-B', str(SCRIPT), '--tasks', str(directory / 'tasks-template.csv'), '--attempts', str(directory / 'attempts-template.csv')], text=True, capture_output=True)
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(proc.stdout, '')

if __name__ == '__main__':
    unittest.main()
