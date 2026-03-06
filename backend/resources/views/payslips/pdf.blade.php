<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Payslip</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 12px; }
        .header { margin-bottom: 18px; }
        .title { font-size: 22px; font-weight: bold; margin: 0; }
        .muted { color: #6b7280; margin: 0; }
        .grid { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .grid td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; }
        .section-title { font-size: 14px; font-weight: bold; margin: 12px 0 8px; }
        table.table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .table th, .table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
        .table th { background: #f9fafb; }
        .text-right { text-align: right; }
        .totals { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .totals td { padding: 6px 8px; border: 1px solid #e5e7eb; }
        .net { font-weight: bold; background: #ecfeff; }
    </style>
</head>
<body>
    <div class="header">
        <p class="title">Payslip</p>
        <p class="muted">Period: {{ $payslip->period_month }}</p>
    </div>

    <table class="grid">
        <tr>
            <td>
                <strong>Employee</strong><br>
                {{ $payslip->user->name }}<br>
                {{ $payslip->user->email }}
            </td>
            <td>
                <strong>Generated</strong><br>
                {{ optional($payslip->generated_at)->format('Y-m-d H:i') ?: '-' }}<br>
                By: {{ optional($payslip->generatedBy)->name ?: '-' }}
            </td>
        </tr>
    </table>

    <p class="section-title">Allowances</p>
    <table class="table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th class="text-right">Value</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse(($payslip->allowances ?? []) as $item)
                <tr>
                    <td>{{ $item['name'] ?? '-' }}</td>
                    <td>{{ ucfirst($item['calculation_type'] ?? 'fixed') }}</td>
                    <td class="text-right">
                        {{ ($item['calculation_type'] ?? 'fixed') === 'percentage' ? ($item['value'] ?? 0).'%' : number_format((float) ($item['value'] ?? 0), 2) }}
                    </td>
                    <td class="text-right">{{ number_format((float) ($item['computed_amount'] ?? 0), 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="4">No allowances</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="section-title">Deductions</p>
    <table class="table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th class="text-right">Value</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse(($payslip->deductions ?? []) as $item)
                <tr>
                    <td>{{ $item['name'] ?? '-' }}</td>
                    <td>{{ ucfirst($item['calculation_type'] ?? 'fixed') }}</td>
                    <td class="text-right">
                        {{ ($item['calculation_type'] ?? 'fixed') === 'percentage' ? ($item['value'] ?? 0).'%' : number_format((float) ($item['value'] ?? 0), 2) }}
                    </td>
                    <td class="text-right">{{ number_format((float) ($item['computed_amount'] ?? 0), 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="4">No deductions</td></tr>
            @endforelse
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td>Basic Salary ({{ $payslip->currency }})</td>
            <td class="text-right">{{ number_format((float) $payslip->basic_salary, 2) }}</td>
        </tr>
        <tr>
            <td>Total Allowances</td>
            <td class="text-right">{{ number_format((float) $payslip->total_allowances, 2) }}</td>
        </tr>
        <tr>
            <td>Total Deductions</td>
            <td class="text-right">{{ number_format((float) $payslip->total_deductions, 2) }}</td>
        </tr>
        <tr class="net">
            <td>Net Salary</td>
            <td class="text-right">{{ number_format((float) $payslip->net_salary, 2) }}</td>
        </tr>
    </table>
</body>
</html>
