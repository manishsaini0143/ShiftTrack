export type ShiftStatus =
    | "scheduled"
    | "active"
    | "completed";

export type Shift = {
    id: string;
    date: string;

    /**
     * For scheduled shifts:
     * planned start time.
     *
     * When shift starts:
     * this becomes the actual start time.
     */
    startTime: string;

    /**
     * null while the shift is active.
     * Set when the shift ends.
     */
    endTime: string | null;

    breakMinutes: number;

    status: ShiftStatus;
};
