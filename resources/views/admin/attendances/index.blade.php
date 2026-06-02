@extends('voyager::master') {{-- kế thừa layout voyager --}}

@section('page_title', 'Chấm công') {{-- tiêu đề --}}

@section('content')
    <div class="page-content container-fluid">
        <h1 class="page-title">
            <i class="voyager-calendar"></i> Chấm công nhân viên
        </h1>

        {{-- hiển thị thông báo thành công --}}
        @if (session('success'))
            <div class="alert alert-success">
                {{ session('success') }}
            </div>
        @endif

        <div class="panel panel-bordered">
            <div class="panel-body">
                <form method="GET" action="{{ route('admin.attendances.index') }}" class="form-inline">
                    <div class="form-group">
                        <label>Chọn ngày</label>
                        <input type="date" name="date" class="form-control" value="{{ $date }}">
                    </div>

                    <button type="submit" class="btn btn-primary" style="margin-left: 10px;">
                        Xem ngày
                    </button>
                </form>
            </div>
        </div>

        <form method="POST" action="{{ route('admin.attendances.store') }}">
            @csrf

            <input type="hidden" name="work_date" value="{{ $date }}">

            <div class="panel panel-bordered">
                <div class="panel-heading">
                    <h3 class="panel-title">Chấm công ngày {{ $date }}</h3>
                </div>

                <div class="panel-body">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Nhân viên</th>
                                <th>Trạng thái</th>
                                <th>Công tính</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>

                        <tbody>
                            @foreach ($stylists as $stylist)
                                @php
                                    $attendance = $attendances->get($stylist->id);
                                    $currentStatus = $attendance->status ?? 'present';
                                @endphp

                                <tr>
                                    <td>
                                        <strong>{{ $stylist->name }}</strong>
                                    </td>

                                    <td>
                                        <select name="attendances[{{ $stylist->id }}][status]"
                                            class="form-control attendance-status">
                                            <option value="present" {{ $currentStatus == 'present' ? 'selected' : '' }}>Đi
                                                làm</option>
                                            <option value="half_day" {{ $currentStatus == 'half_day' ? 'selected' : '' }}>
                                                Nửa ngày</option>
                                            <option value="absent" {{ $currentStatus == 'absent' ? 'selected' : '' }}>Nghỉ
                                            </option>
                                            <option value="off" {{ $currentStatus == 'off' ? 'selected' : '' }}>Ngày
                                                nghỉ</option>
                                        </select>
                                    </td>

                                    <td>
                                        @if ($currentStatus == 'present')
                                            1 công
                                        @elseif($currentStatus == 'half_day')
                                            0.5 công
                                        @else
                                            0 công
                                        @endif
                                    </td>

                                    <td>
                                        <input type="text" name="attendances[{{ $stylist->id }}][note]"
                                            class="form-control" value="{{ $attendance->note ?? '' }}"
                                            placeholder="Ghi chú nếu có">
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>

                    <button type="submit" class="btn btn-success">
                        <i class="voyager-check"></i> Lưu chấm công
                    </button>
                </div>
            </div>
        </form>
    </div>
@endsection
