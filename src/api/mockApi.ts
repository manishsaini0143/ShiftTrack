import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    Shift,
    ShiftStatus,
} from "../types/shift";

const TEST_EMAIL = "staff@shifttrack.test";
const TEST_PASSWORD = "Password123";

const SHIFTS_KEY =
    "shifttrack_mock_shifts";

let shouldFailNextRequest = false;

/**
 * Get today's date in YYYY-MM-DD format.
 */
function getTodayDate() {
    const today = new Date();

    const year =
        today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/**
 * Initial scheduled shift.
 *
 * This is NOT active.
 *
 * User must press "Start Shift"
 * on this shift.
 */
const initialShifts: Shift[] = [
    {
        id: "s1",

        date: getTodayDate(),

        startTime:
            `${getTodayDate()}T09:00:00`,

        endTime:
            `${getTodayDate()}T17:30:00`,

        breakMinutes: 30,

        status: "scheduled",
    },
];

/**
 * Used by the UI to demonstrate
 * API error handling.
 */
export function simulateNextApiError() {
    shouldFailNextRequest = true;
}

/**
 * Simulate an API failure.
 */
function checkForMockError() {
    if (!shouldFailNextRequest) {
        return;
    }

    shouldFailNextRequest = false;

    throw new Error(
        "Mock API error: unable to load shifts."
    );
}

/**
 * Simulate network latency.
 */
const wait = (ms: number) =>
    new Promise<void>((resolve) =>
        setTimeout(resolve, ms)
    );

/**
 * Read shifts from AsyncStorage.
 *
 * Also handles old data created before
 * the status field was introduced.
 */
async function getStoredShifts(): Promise<Shift[]> {
    const stored =
        await AsyncStorage.getItem(
            SHIFTS_KEY
        );

    if (!stored) {
        await AsyncStorage.setItem(
            SHIFTS_KEY,
            JSON.stringify(initialShifts)
        );

        return initialShifts;
    }

    const parsed =
        JSON.parse(stored) as Partial<Shift>[];

    /**
     * Migration for old stored shifts.
     *
     * If an old shift has endTime,
     * treat it as completed.
     *
     * If it has no endTime,
     * treat it as active.
     */
    const migrated: Shift[] =
        parsed.map((shift) => {
            let status: ShiftStatus;

            if (shift.status) {
                status = shift.status;
            } else if (shift.endTime) {
                status = "completed";
            } else {
                status = "active";
            }

            return {
                id: shift.id!,
                date: shift.date!,
                startTime:
                    shift.startTime!,
                endTime:
                    shift.endTime ?? null,
                breakMinutes:
                    shift.breakMinutes ?? 0,
                status,
            };
        });

    /**
     * Save migrated data so we don't
     * have to migrate again next time.
     */
    await saveShifts(migrated);

    return migrated;
}

/**
 * Persist shifts.
 */
async function saveShifts(
    shifts: Shift[]
) {
    await AsyncStorage.setItem(
        SHIFTS_KEY,
        JSON.stringify(shifts)
    );
}

/**
 * Login
 *
 * POST /auth/login
 */
export async function login(
    email: string,
    password: string
) {
    await wait(500);

    if (
        email !== TEST_EMAIL ||
        password !== TEST_PASSWORD
    ) {
        throw new Error(
            "Invalid email or password"
        );
    }

    return {
        token: "abc123",

        user: {
            id: "u1",
            name: "Alex",
        },
    };
}

/**
 * Get shifts for a week.
 *
 * GET /shifts?weekStart=YYYY-MM-DD
 */
export async function getShifts(
    weekStart: string
): Promise<Shift[]> {
    await wait(500);

    checkForMockError();

    const shifts =
        await getStoredShifts();

    const start =
        new Date(
            `${weekStart}T00:00:00`
        );

    const end =
        new Date(start);

    end.setDate(
        end.getDate() + 7
    );

    return shifts.filter(
        (shift) => {
            const shiftDate =
                new Date(
                    `${shift.date}T00:00:00`
                );

            return (
                shiftDate >= start &&
                shiftDate < end
            );
        }
    );
}

/**
 * Create a scheduled shift.
 *
 * POST /shifts
 *
 * IMPORTANT:
 * Creating a shift does NOT start it.
 */
export async function createShift(
    shift: Omit<
        Shift,
        "id" | "status"
    >
): Promise<Shift> {
    await wait(500);

    checkForMockError();

    const shifts =
        await getStoredShifts();

    /**
     * Only one active shift is allowed.
     *
     * This check is mostly defensive because
     * a scheduled shift should not be active.
     */
    const activeShift =
        shifts.find(
            (item) =>
                item.status === "active"
        );

    if (activeShift) {
        throw new Error(
            "Please end the active shift before creating another shift."
        );
    }

    const newShift: Shift = {
        ...shift,

        id: `s${Date.now()}`,

        /**
         * New shifts are always scheduled.
         */
        status: "scheduled",
    };

    shifts.push(newShift);

    await saveShifts(shifts);

    return newShift;
}

/**
 * Update an existing shift.
 *
 * PATCH /shifts/:id
 *
 * Used for:
 *
 * scheduled -> active
 * active -> completed
 */
export async function updateShift(
    id: string,
    updates: Partial<Shift>
): Promise<Shift> {
    await wait(500);

    checkForMockError();

    const shifts =
        await getStoredShifts();

    const index =
        shifts.findIndex(
            (shift) =>
                shift.id === id
        );

    if (index === -1) {
        throw new Error(
            "Shift not found"
        );
    }

    const currentShift =
        shifts[index];

    /**
     * Starting a shift.
     *
     * status becomes active.
     *
     * endTime must be null.
     */
    if (
        updates.status === "active"
    ) {
        const anotherActiveShift =
            shifts.find(
                (shift) =>
                    shift.id !== id &&
                    shift.status === "active"
            );

        if (anotherActiveShift) {
            throw new Error(
                "Another shift is already active."
            );
        }

        updates.endTime = null;

        /**
         * If caller doesn't provide
         * startTime, use current time.
         */
        if (!updates.startTime) {
            updates.startTime =
                new Date().toISOString();
        }
    }

    /**
     * Ending a shift.
     *
     * status becomes completed.
     */
    if (
        updates.status === "completed"
    ) {
        if (
            !updates.endTime
        ) {
            updates.endTime =
                new Date().toISOString();
        }
    }

    const updatedShift: Shift = {
        ...currentShift,
        ...updates,
    };

    shifts[index] =
        updatedShift;

    await saveShifts(shifts);

    return updatedShift;
}
