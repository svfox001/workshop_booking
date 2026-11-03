<?php

namespace App\Http\Requests;

use App\Enums\BookingStatus;
use App\Rules\Iso8601DateTime;
use App\Support\WorkshopTime;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('rego'))) {
            $this->merge(['rego' => mb_strtoupper(trim($this->input('rego')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'string', 'email', 'max:255'],
            'rego' => ['required', 'string', 'max:20'],
            'service_bay' => ['required', 'string', Rule::in(config('workshop.service_bays'))],
            'starts_at' => ['required', 'string', new Iso8601DateTime],
            'ends_at' => ['required', 'string', new Iso8601DateTime],
            'status' => $this->statusRules(),
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return list<mixed>
     */
    protected function statusRules(): array
    {
        return ['sometimes', 'required', Rule::enum(BookingStatus::class)];
    }

    public function messages(): array
    {
        return [
            'service_bay.in' => 'The selected service bay is not a configured bay.',
        ];
    }

    /**
     * Compare the range only after both values are normalised to UTC.
     *
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['starts_at', 'ends_at'])) {
                    return;
                }

                $startsAt = WorkshopTime::parse($this->input('starts_at'));
                $endsAt = WorkshopTime::parse($this->input('ends_at'));

                if ($startsAt && $endsAt && $endsAt->lte($startsAt)) {
                    $validator->errors()->add('ends_at', 'The end time must be after the start time.');
                }
            },
        ];
    }

    /**
     * Validated attributes with date-times normalised to UTC.
     *
     * @return array<string, mixed>
     */
    public function bookingAttributes(): array
    {
        $data = $this->validated();

        $data['starts_at'] = WorkshopTime::parse($data['starts_at']);
        $data['ends_at'] = WorkshopTime::parse($data['ends_at']);
        $data['status'] = BookingStatus::from($data['status'] ?? BookingStatus::Pending->value);
        $data['notes'] ??= null;

        return $data;
    }
}
