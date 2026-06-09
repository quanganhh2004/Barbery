```php
@extends('voyager::master')

@section('page_title', 'Dashboard')

@section('content')
    @php
        $today = \Carbon\Carbon::today();
        $month = $today->month;
        $year = $today->year;

        $cancelledStatuses = ['cancelled', 'canceled', 'reject', 'rejected'];
        $completedStatuses = ['completed', 'done', 'paid'];
        $dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

        $completedBookings = DB::table('bookings')
            ->whereMonth('booking_date', $month)
            ->whereYear('booking_date', $year)
            ->whereIn('status', $completedStatuses)
            ->count();

        $monthRevenue = DB::table('bookings')
            ->whereMonth('booking_date', $month)
            ->whereYear('booking_date', $year)
            ->whereIn('status', $completedStatuses)
            ->sum('total_price');

        $activeStylists = DB::table('stylists')->where('is_active', 1)->count();
        $activeServices = DB::table('services')->where('is_active', 1)->count();

        $upcomingDays = collect(range(1, 12))->map(function ($i) use ($today, $dayNames, $cancelledStatuses) {
            $date = $today->copy()->addDays($i);

            return [
                'day' => $dayNames[$date->dayOfWeek],
                'date' => $date->format('d/m'),
                'count' => DB::table('bookings')
                    ->whereDate('booking_date', $date->toDateString())
                    ->whereNotIn('status', $cancelledStatuses)
                    ->count(),
            ];
        });

        $maxBooking = max(1, $upcomingDays->max('count'));
        $totalUpcoming = $upcomingDays->sum('count');
        $busiestDay = $upcomingDays->sortByDesc('count')->first();

        $stylistReports = DB::table('stylists')
            ->leftJoin('bookings', function ($join) use ($month, $year, $completedStatuses) {
                $join
                    ->on('stylists.id', '=', 'bookings.stylist_id')
                    ->whereMonth('bookings.booking_date', $month)
                    ->whereYear('bookings.booking_date', $year)
                    ->whereIn('bookings.status', $completedStatuses);
            })
            ->select('stylists.id', 'stylists.name', DB::raw('COUNT(bookings.id) as total_bookings'))
            ->where('stylists.is_active', 1)
            ->groupBy('stylists.id', 'stylists.name')
            ->orderByDesc('total_bookings')
            ->orderBy('stylists.name')
            ->get();

        $pageStyle = 'background:#f5f7fb;min-height:calc(100vh - 60px);padding:12px 22px 18px;';
        $containerStyle = 'max-width:1320px;margin:0 auto;';
        $cardStyle =
            'background:#fff;border:1px solid #e8edf3;border-radius:15px;box-shadow:0 8px 20px rgba(15,23,42,.04);overflow:hidden;margin-bottom:14px;';
        $statStyle =
            $cardStyle . 'padding:14px 16px;min-height:92px;display:flex;align-items:center;gap:14px;width:100%;';
        $iconStyle =
            'width:50px;height:50px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;';
        $panelHead = 'padding:13px 18px;border-bottom:1px solid #eef2f7;';
        $panelBody = 'padding:14px 18px;display:flex;flex-direction:column;flex:1;';
        $titleStyle = 'margin:0;font-size:17px;font-weight:800;color:#111827;display:flex;align-items:center;gap:9px;';
        $tableTh =
            'background:#f8fafc;color:#64748b;font-size:13px;font-weight:700;border-bottom:1px solid #edf1f5;padding:10px 14px;position:sticky;top:0;z-index:1;';
        $tableTd =
            'padding:9px 14px;vertical-align:middle;border-bottom:1px solid #edf1f5;color:#64748b;font-size:13px;';
    @endphp

    <div class="page-content" style="{{ $pageStyle }}">
        <div style="{{ $containerStyle }}">
            @include('voyager::alerts')

            <div style="margin-bottom:12px;">
                <h1 style="margin:0;font-size:22px;font-weight:800;color:#111827;line-height:1.2;">Dashboard</h1>
                <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">
                    Tổng quan lịch hẹn, doanh thu, nhân viên và dịch vụ trong hệ thống.
                </p>
            </div>

            <div class="row" style="display:flex;flex-wrap:wrap;align-items:stretch;">
                @foreach ([['icon' => 'voyager-check', 'bg' => '#eaf3ff', 'color' => '#1683f3', 'value' => $completedBookings, 'text' => 'Lịch hẹn hoàn thành trong tháng'], ['icon' => 'voyager-dollar', 'bg' => '#e9fbef', 'color' => '#16a34a', 'value' => number_format($monthRevenue) . 'đ', 'text' => 'Doanh thu tháng ' . $month . '/' . $year], ['icon' => 'voyager-people', 'bg' => '#f2ecff', 'color' => '#7c3aed', 'value' => $activeStylists, 'text' => 'Nhân viên đang hoạt động'], ['icon' => 'voyager-scissors', 'bg' => '#fff3e4', 'color' => '#f97316', 'value' => $activeServices, 'text' => 'Dịch vụ đang hoạt động']] as $stat)
                    <div class="col-lg-3 col-md-6 col-sm-6" style="display:flex;">
                        <div style="{{ $statStyle }}">
                            <div style="{{ $iconStyle }}background:{{ $stat['bg'] }};color:{{ $stat['color'] }};">
                                <i class="{{ $stat['icon'] }}"></i>
                            </div>

                            <div>
                                <h3
                                    style="margin:0;font-size:25px;line-height:1.1;font-weight:800;color:#111827;letter-spacing:-.02em;">
                                    {{ $stat['value'] }}
                                </h3>
                                <p style="margin:5px 0 0;color:#94a3b8;font-size:13px;line-height:1.3;">
                                    {{ $stat['text'] }}
                                </p>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>

            <div class="row" style="display:flex;flex-wrap:wrap;align-items:stretch;">
                <div class="col-lg-7 col-md-12" style="display:flex;">
                    <div style="{{ $cardStyle }}width:100%;display:flex;flex-direction:column;">
                        <div style="{{ $panelHead }}">
                            <h3 style="{{ $titleStyle }}">
                                <i class="voyager-calendar" style="color:#1683f3;font-size:18px;"></i>
                                Số lịch hẹn 12 ngày tới
                            </h3>
                        </div>

                        <div style="{{ $panelBody }}">
                            <div style="height:208px;display:flex;flex-direction:column;justify-content:flex-end;">
                                <div
                                    style="display:flex;align-items:flex-end;gap:9px;height:198px;padding:2px 2px 0;overflow-x:auto;">
                                    @foreach ($upcomingDays as $item)
                                        @php
                                            $height =
                                                $item['count'] > 0
                                                    ? max(8, round(($item['count'] / $maxBooking) * 100))
                                                    : 0;
                                        @endphp

                                        <div style="flex:1;min-width:54px;text-align:center;">
                                            <div
                                                style="height:17px;margin-bottom:5px;font-size:12px;font-weight:800;color:#111827;">
                                                {{ $item['count'] }}
                                            </div>

                                            <div
                                                style="height:122px;background:#eef2f7;border-radius:9px;display:flex;align-items:flex-end;overflow:hidden;">
                                                <div
                                                    style="width:100%;height:{{ $height }}%;background:linear-gradient(180deg,#46a7ff 0%,#1683f3 100%);border-radius:9px 9px 0 0;">
                                                </div>
                                            </div>

                                            <div
                                                style="margin-top:7px;color:#94a3b8;font-size:11.5px;line-height:1.25;white-space:nowrap;">
                                                {{ $item['date'] }}<br>
                                                {{ mb_substr($item['day'], 0, 5) }}
                                            </div>
                                        </div>
                                    @endforeach
                                </div>
                            </div>

                            <div class="row" style="margin-top:auto;">
                                <div class="col-sm-6">
                                    <div
                                        style="background:#f8fafc;border:1px solid #e8edf3;border-radius:12px;padding:11px 14px;min-height:58px;margin-top:10px;">
                                        <strong
                                            style="display:block;font-size:20px;line-height:1.1;font-weight:800;color:#1683f3;margin-bottom:3px;">
                                            {{ $totalUpcoming }}
                                        </strong>
                                        <p style="margin:0;color:#94a3b8;font-size:12.5px;">Tổng lịch trong 12 ngày tới</p>
                                    </div>
                                </div>

                                <div class="col-sm-6">
                                    <div
                                        style="background:#f8fafc;border:1px solid #e8edf3;border-radius:12px;padding:11px 14px;min-height:58px;margin-top:10px;">
                                        <strong
                                            style="display:block;font-size:20px;line-height:1.1;font-weight:800;color:#1683f3;margin-bottom:3px;">
                                            {{ $busiestDay['count'] ?? 0 }} lịch
                                        </strong>
                                        <p style="margin:0;color:#94a3b8;font-size:12.5px;">
                                            Ngày nhiều nhất: {{ $busiestDay['date'] ?? '--/--' }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-5 col-md-12" style="display:flex;">
                    <div style="{{ $cardStyle }}width:100%;display:flex;flex-direction:column;">
                        <div style="{{ $panelHead }}">
                            <h3 style="{{ $titleStyle }}">
                                <i class="voyager-person" style="color:#1683f3;font-size:18px;"></i>
                                Lịch hoàn thành theo nhân viên
                            </h3>
                        </div>

                        <div style="{{ $panelBody }}">
                            <div style="border:1px solid #edf1f5;border-radius:13px;overflow:auto;max-height:318px;">
                                <table style="width:100%;margin:0;border-collapse:collapse;">
                                    <thead>
                                        <tr>
                                            <th style="{{ $tableTh }}">Nhân viên</th>
                                            <th class="text-center" style="{{ $tableTh }}">Số lịch hoàn thành trong
                                                tháng</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        @forelse ($stylistReports as $stylist)
                                            <tr>
                                                <td style="{{ $tableTd }}">
                                                    <span
                                                        style="font-weight:700;color:#334155;">{{ $stylist->name }}</span>
                                                </td>

                                                <td class="text-center" style="{{ $tableTd }}">
                                                    <span style="color:#64748b;font-weight:600;">
                                                        {{ $stylist->total_bookings }} lịch
                                                    </span>
                                                </td>
                                            </tr>
                                        @empty
                                            <tr>
                                                <td colspan="2" class="text-center" style="{{ $tableTd }}">
                                                    Chưa có dữ liệu nhân viên.
                                                </td>
                                            </tr>
                                        @endforelse
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="{{ $cardStyle }}">
                <div style="padding:12px 18px;border-bottom:1px solid #eef2f7;">
                    <h3 style="margin:0;font-size:16px;font-weight:800;color:#111827;">
                        <i class="voyager-bolt"></i> Thao tác nhanh
                    </h3>
                </div>

                <div style="padding:12px 18px;display:flex;flex-wrap:wrap;gap:8px;">
                    <a href="{{ url('/admin/bookings/create') }}" class="btn btn-primary"
                        style="border-radius:8px;font-weight:700;padding:7px 12px;min-width:130px;font-size:13px;">
                        <i class="voyager-calendar"></i> Thêm lịch hẹn
                    </a>

                    <a href="{{ url('/admin/bookings') }}" class="btn btn-default"
                        style="border-radius:8px;font-weight:700;padding:7px 12px;min-width:130px;font-size:13px;">
                        <i class="voyager-list"></i> Quản lý lịch hẹn
                    </a>

                    <a href="{{ url('/admin/services') }}" class="btn btn-success"
                        style="border-radius:8px;font-weight:700;padding:7px 12px;min-width:130px;font-size:13px;">
                        <i class="voyager-scissors"></i> Quản lý dịch vụ
                    </a>

                    <a href="{{ url('/admin/stylists') }}" class="btn btn-info"
                        style="border-radius:8px;font-weight:700;padding:7px 12px;min-width:130px;font-size:13px;">
                        <i class="voyager-people"></i> Quản lý nhân viên
                    </a>

                    <a href="{{ url('/admin/salaries') }}" class="btn btn-warning"
                        style="border-radius:8px;font-weight:700;padding:7px 12px;min-width:130px;font-size:13px;">
                        <i class="voyager-dollar"></i> Bảng lương
                    </a>
                </div>
            </div>
        </div>
    </div>
@endsection
```
