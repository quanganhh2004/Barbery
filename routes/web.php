<?php

use App\Http\Controllers\Admin\AttendanceController;
use App\Http\Controllers\Admin\BookingActionController;
use App\Http\Controllers\Admin\SalaryController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CatalogApiController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\HairstyleController;
use App\Http\Controllers\SiteController;
use Illuminate\Support\Facades\Route;
use TCG\Voyager\Facades\Voyager;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// ===== SITE PAGES =====
//trang chủ
Route::get('/', [SiteController::class, 'home'])->name('site.home');
// đặt lịch
Route::get('/booking', [SiteController::class, 'booking'])->name('site.booking');
//tra cứu lịch
Route::get('/lookup', [SiteController::class, 'lookup'])->name('site.lookup');

// ===== VOYAGER ADMIN =====
Route::group(['prefix' => 'admin'], function () {
    Voyager::routes();
});

Route::group(['prefix' => 'admin', 'middleware' => ['admin.user']], function () {
    Route::match(['GET', 'POST'], 'bookings/{id}/confirm', [BookingActionController::class, 'confirm'])
        ->name('admin.bookings.action.confirm');

    Route::match(['GET', 'POST'], 'bookings/{id}/cancel', [BookingActionController::class, 'cancel'])
        ->name('admin.bookings.action.cancel');

    Route::match(['GET', 'POST'], 'bookings/{id}/complete', [BookingActionController::class, 'complete'])
        ->name('admin.bookings.action.complete');

    // ===== ATTENDANCE ADMIN =====
    Route::get('attendances', [AttendanceController::class, 'index'])
        ->name('admin.attendances.index');

    Route::post('attendances', [AttendanceController::class, 'store'])
        ->name('admin.attendances.store');

    // ===== SALARY ADMIN =====
    Route::get('salaries', [SalaryController::class, 'index'])
        ->name('admin.salaries.index');

    Route::post('salaries/calculate', [SalaryController::class, 'calculate'])
        ->name('admin.salaries.calculate');

    Route::get('salaries/{id}', [SalaryController::class, 'show'])
        ->name('admin.salaries.show');

    Route::post('salaries/{id}/paid', [SalaryController::class, 'markPaid'])
        ->name('admin.salaries.paid');
});

// ===== API =====
Route::prefix('api')->group(function () {
    //danh sách dịch vụ
    Route::get('/services', [CatalogApiController::class, 'services'])->name('api.services');
    //danh sách thợ
    Route::get('/stylists', [CatalogApiController::class, 'stylists'])->name('api.stylists');
    //tạo lịch đặt mới
    Route::post('/bookings', [BookingController::class, 'store'])->name('api.bookings.store');
    //tra cứu lich
    Route::get('/lookup', [BookingController::class, 'lookup'])->name('api.lookup');
    //tự ẩn slot bị chiếm
    Route::get('/available-slots', [BookingController::class, 'availableSlots'])->name('api.availableSlots');
});

Route::get('/hairstyle/suggest', [HairstyleController::class, 'index'])->name('hairstyle.index');
Route::post('/hairstyle/analyze', [HairstyleController::class, 'analyze'])->name('hairstyle.analyze');

Route::post('/chatbot/send', [ChatbotController::class, 'send'])->name('chatbot.send');
