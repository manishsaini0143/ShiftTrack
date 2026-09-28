import React, {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    ActivityIndicator,
    AppState,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    getShifts,
    updateShift,
    simulateNextApiError,
} from "../api/mockApi";

import { Shift } from "../types/shift";

import {
    formatDuration,
    getElapsedSeconds,
    getWeekStartDate,
} from "../utils/time";

type Props = {
    onCreateShift: () => void;
    onLogout: () => void;
};

export default function ShiftsScreen({
    onCreateShift,
    onLogout,
}: Props) {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    /**
     * Prevents double submission when
     * starting or ending a shift.
     */
    const [actionLoading, setActionLoading] =
        useState(false);

    /**
     * A shift is active only when its
     * status is "active".
     */
    const activeShift =
        shifts.find(
            (shift) => shift.status === "active"
        ) ?? null;

    /**
     * Load this week's shifts.
     */
    const loadShifts = useCallback(async () => {
        try {
            setError("");
            setLoading(true);

            const weekStart =
                getWeekStartDate();

            const data =
                await getShifts(weekStart);

            setShifts(data);

            /**
             * Restore active timer if an active
             * shift exists in AsyncStorage.
             */
            const active =
                data.find(
                    (shift) =>
                        shift.status === "active"
                );

            if (active) {
                setElapsedSeconds(
                    getElapsedSeconds(
                        active.startTime
                    )
                );
            } else {
                setElapsedSeconds(0);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load shifts."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Initial load.
     */
    useEffect(() => {
        loadShifts();
    }, [loadShifts]);

    /**
     * Live timer.
     *
     * We calculate the elapsed time from
     * startTime instead of incrementing a
     * counter. This keeps the timer accurate
     * after backgrounding.
     */
    useEffect(() => {
        if (!activeShift) {
            setElapsedSeconds(0);
            return;
        }

        const updateTimer = () => {
            setElapsedSeconds(
                getElapsedSeconds(
                    activeShift.startTime
                )
            );
        };

        updateTimer();

        const interval = setInterval(
            updateTimer,
            1000
        );

        return () => {
            clearInterval(interval);
        };
    }, [activeShift]);

    /**
     * Recalculate timer when app comes
     * back from background.
     */
    useEffect(() => {
        const subscription =
            AppState.addEventListener(
                "change",
                (nextState) => {
                    if (
                        nextState === "active" &&
                        activeShift
                    ) {
                        setElapsedSeconds(
                            getElapsedSeconds(
                                activeShift.startTime
                            )
                        );
                    }
                }
            );

        return () => {
            subscription.remove();
        };
    }, [activeShift]);

    /**
     * Start an EXISTING scheduled shift.
     *
     * This does NOT create a new shift.
     */
    async function handleStartShift(
        shift: Shift
    ) {
        /**
         * Don't start another shift while
         * one is already active.
         */
        if (activeShift) {
            return;
        }

        /**
         * Prevent double submission.
         */
        if (actionLoading) {
            return;
        }

        /**
         * Only scheduled shifts can be started.
         */
        if (shift.status !== "scheduled") {
            return;
        }

        try {
            setError("");
            setActionLoading(true);

            const startTime =
                new Date().toISOString();

            /**
             * PATCH existing shift.
             *
             * scheduled -> active
             */
            const updatedShift =
                await updateShift(
                    shift.id,
                    {
                        status: "active",
                        startTime,
                        endTime: null,
                    }
                );

            setShifts((current) =>
                current.map((item) =>
                    item.id ===
                    updatedShift.id
                        ? updatedShift
                        : item
                )
            );

            setElapsedSeconds(
                getElapsedSeconds(
                    updatedShift.startTime
                )
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to start shift."
            );
        } finally {
            setActionLoading(false);
        }
    }

    /**
     * End the currently active shift.
     */
    async function handleEndShift() {
        if (!activeShift) {
            return;
        }

        if (actionLoading) {
            return;
        }

        try {
            setError("");
            setActionLoading(true);

            const endTime =
                new Date().toISOString();

            /**
             * PATCH existing shift.
             *
             * active -> completed
             */
            const updatedShift =
                await updateShift(
                    activeShift.id,
                    {
                        status: "completed",
                        endTime,
                    }
                );

            setShifts((current) =>
                current.map((shift) =>
                    shift.id ===
                    updatedShift.id
                        ? updatedShift
                        : shift
                )
            );

            setElapsedSeconds(0);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to end shift."
            );
        } finally {
            setActionLoading(false);
        }
    }

    /**
     * Calculate completed shift duration.
     */
    function calculateDuration(
        shift: Shift
    ) {
        /**
         * Active shift uses the live timer
         * shown in the active card.
         */
        if (shift.status === "active") {
            return "Active";
        }

        if (!shift.endTime) {
            return "Not started";
        }

        const start =
            new Date(
                shift.startTime
            ).getTime();

        const end =
            new Date(
                shift.endTime
            ).getTime();

        const totalMinutes =
            Math.max(
                0,
                Math.floor(
                    (end - start) /
                        60000
                ) -
                    shift.breakMinutes
            );

        const hours =
            Math.floor(
                totalMinutes / 60
            );

        const minutes =
            totalMinutes % 60;

        return `${hours}h ${minutes}m`;
    }

    /**
     * Format ISO time for UI.
     */
    function formatTime(
        value: string
    ) {
        return new Date(
            value
        ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    /**
     * Loading state.
     */
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator
                    size="large"
                    color="#2563EB"
                />

                <Text
                    style={
                        styles.statusText
                    }
                >
                    Loading shifts...
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* =========================
                HEADER
            ========================== */}
            <View style={styles.header}>
                <View>
                    <Text
                        style={styles.title}
                    >
                        This Week
                    </Text>

                    <Text
                        style={
                            styles.subtitle
                        }
                    >
                        Your scheduled shifts
                    </Text>
                </View>

                <View
                    style={
                        styles.headerActions
                    }
                >
                    {/* Add Shift */}
                    <TouchableOpacity
                        style={[
                            styles.addButton,
                            activeShift &&
                                styles.disabledButton,
                        ]}
                        onPress={
                            onCreateShift
                        }
                        disabled={
                            !!activeShift ||
                            actionLoading
                        }
                        activeOpacity={0.8}
                    >
                        <Text
                            style={
                                styles.addButtonText
                            }
                        >
                            + Add Shift
                        </Text>
                    </TouchableOpacity>

                    {/* Logout */}
                    <TouchableOpacity
                        style={
                            styles.logoutButton
                        }
                        onPress={
                            onLogout
                        }
                        disabled={
                            !!activeShift ||
                            actionLoading
                        }
                    >
                        <Text
                            style={
                                styles.logoutText
                            }
                        >
                            Logout
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* =========================
                ERROR STATE
            ========================== */}
            {error ? (
                <View
                    style={
                        styles.errorBox
                    }
                >
                    <View
                        style={
                            styles.errorContent
                        }
                    >
                        <Text
                            style={
                                styles.errorTitle
                            }
                        >
                            Something went wrong
                        </Text>

                        <Text
                            style={
                                styles.error
                            }
                        >
                            {error}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={
                            loadShifts
                        }
                        style={
                            styles.retryButton
                        }
                    >
                        <Text
                            style={
                                styles.retry
                            }
                        >
                            Retry
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* =========================
                ACTIVE SHIFT
            ========================== */}
            {activeShift ? (
                <View
                    style={
                        styles.activeCard
                    }
                >
                    <View
                        style={
                            styles.activeHeader
                        }
                    >
                        <View
                            style={
                                styles.activeBadge
                            }
                        >
                            <View
                                style={
                                    styles.activeDot
                                }
                            />

                            <Text
                                style={
                                    styles.activeBadgeText
                                }
                            >
                                ACTIVE
                            </Text>
                        </View>

                        <Text
                            style={
                                styles.activeDate
                            }
                        >
                            {activeShift.date}
                        </Text>
                    </View>

                    <Text
                        style={
                            styles.activeTitle
                        }
                    >
                        Current Shift
                    </Text>

                    <Text
                        style={
                            styles.timer
                        }
                    >
                        {formatDuration(
                            elapsedSeconds
                        )}
                    </Text>

                    <Text
                        style={
                            styles.activeStarted
                        }
                    >
                        Started at{" "}
                        {formatTime(
                            activeShift.startTime
                        )}
                    </Text>

                    <TouchableOpacity
                        style={
                            styles.endButton
                        }
                        onPress={
                            handleEndShift
                        }
                        disabled={
                            actionLoading
                        }
                        activeOpacity={0.8}
                    >
                        {actionLoading ? (
                            <ActivityIndicator
                                color="#FFFFFF"
                            />
                        ) : (
                            <Text
                                style={
                                    styles.buttonText
                                }
                            >
                                End Shift
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* =========================
                SHIFTS LIST / EMPTY STATE
            ========================== */}
            {shifts.length === 0 ? (
                <View
                    style={
                        styles.empty
                    }
                >
                    <View
                        style={
                            styles.emptyIcon
                        }
                    >
                        <Text
                            style={
                                styles.emptyIconText
                            }
                        >
                            +
                        </Text>
                    </View>

                    <Text
                        style={
                            styles.emptyTitle
                        }
                    >
                        No shifts yet
                    </Text>

                    <Text
                        style={
                            styles.emptyText
                        }
                    >
                        Create your first
                        shift to get
                        started.
                    </Text>

                    <TouchableOpacity
                        style={
                            styles.emptyButton
                        }
                        onPress={
                            onCreateShift
                        }
                        disabled={
                            actionLoading
                        }
                    >
                        <Text
                            style={
                                styles.emptyButtonText
                            }
                        >
                            Create Shift
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={shifts}
                    keyExtractor={(
                        item
                    ) => item.id}
                    onRefresh={
                        loadShifts
                    }
                    refreshing={
                        loading
                    }
                    showsVerticalScrollIndicator={
                        false
                    }
                    contentContainerStyle={
                        styles.listContent
                    }
                    renderItem={({
                        item,
                    }) => {
                        const isScheduled =
                            item.status ===
                            "scheduled";

                        const isActive =
                            item.status ===
                            "active";

                        const isCompleted =
                            item.status ===
                            "completed";

                        /**
                         * Another shift is active.
                         *
                         * This scheduled shift
                         * must not be startable.
                         */
                        const anotherShiftActive =
                            !!activeShift &&
                            activeShift.id !==
                                item.id;

                        return (
                            <View
                                style={[
                                    styles.card,

                                    isActive &&
                                        styles.activeListCard,

                                    isCompleted &&
                                        styles.completedCard,
                                ]}
                            >
                                {/* Card Header */}
                                <View
                                    style={
                                        styles.cardHeader
                                    }
                                >
                                    <View
                                        style={
                                            styles.cardHeaderLeft
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.date
                                            }
                                        >
                                            {item.date}
                                        </Text>

                                        <Text
                                            style={
                                                styles.cardTime
                                            }
                                        >
                                            {formatTime(
                                                item.startTime
                                            )}

                                            {" - "}

                                            {item.endTime
                                                ? formatTime(
                                                    item.endTime
                                                )
                                                : isActive
                                                    ? "Active"
                                                    : "Not started"}
                                        </Text>
                                    </View>

                                    {/* Status Badge */}
                                    {isScheduled ? (
                                        <View
                                            style={
                                                styles.statusScheduled
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.statusScheduledText
                                                }
                                            >
                                                Scheduled
                                            </Text>
                                        </View>
                                    ) : null}

                                    {isActive ? (
                                        <View
                                            style={
                                                styles.statusActive
                                            }
                                        >
                                            <View
                                                style={
                                                    styles.statusDot
                                                }
                                            />

                                            <Text
                                                style={
                                                    styles.statusActiveText
                                                }
                                            >
                                                Active
                                            </Text>
                                        </View>
                                    ) : null}

                                    {isCompleted ? (
                                        <View
                                            style={
                                                styles.statusCompleted
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.statusCompletedText
                                                }
                                            >
                                                Completed
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Shift Details */}
                                <View
                                    style={
                                        styles.details
                                    }
                                >
                                    <View
                                        style={
                                            styles.detailItem
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.detailLabel
                                            }
                                        >
                                            Break
                                        </Text>

                                        <Text
                                            style={
                                                styles.detailValue
                                            }
                                        >
                                            {
                                                item.breakMinutes
                                            }{" "}
                                            min
                                        </Text>
                                    </View>

                                    <View
                                        style={
                                            styles.detailDivider
                                        }
                                    />

                                    <View
                                        style={
                                            styles.detailItem
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.detailLabel
                                            }
                                        >
                                            Duration
                                        </Text>

                                        <Text
                                            style={
                                                styles.detailValue
                                            }
                                        >
                                            {
                                                calculateDuration(
                                                    item
                                                )
                                            }
                                        </Text>
                                    </View>
                                </View>

                                {/* =====================
                                    SCHEDULED SHIFT
                                ====================== */}
                                {isScheduled ? (
                                    <>
                                        {anotherShiftActive ? (
                                            <View
                                                style={
                                                    styles.disabledStartContainer
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.disabledStartText
                                                    }
                                                >
                                                    Another shift
                                                    is currently
                                                    active
                                                </Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={[
                                                    styles.startButton,

                                                    actionLoading &&
                                                        styles.disabledButton,
                                                ]}
                                                onPress={() =>
                                                    handleStartShift(
                                                        item
                                                    )
                                                }
                                                disabled={
                                                    actionLoading
                                                }
                                                activeOpacity={
                                                    0.8
                                                }
                                            >
                                                {actionLoading ? (
                                                    <ActivityIndicator
                                                        color="#FFFFFF"
                                                    />
                                                ) : (
                                                    <Text
                                                        style={
                                                            styles.buttonText
                                                        }
                                                    >
                                                        Start Shift
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </>
                                ) : null}

                                {/* =====================
                                    ACTIVE SHIFT
                                ====================== */}
                                {isActive ? (
                                    <View
                                        style={
                                            styles.activeInfo
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.activeInfoText
                                            }
                                        >
                                            This shift is
                                            currently
                                            running.
                                        </Text>
                                    </View>
                                ) : null}

                                {/* =====================
                                    COMPLETED SHIFT
                                ====================== */}
                                {isCompleted ? (
                                    <View
                                        style={
                                            styles.completedInfo
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.completedInfoText
                                            }
                                        >
                                            Shift completed
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        );
                    }}
                />
            )}

            {/* =========================
                TEST API ERROR
            ========================== */}
            <TouchableOpacity
                style={
                    styles.testErrorButton
                }
                onPress={() => {
                    simulateNextApiError();
                    loadShifts();
                }}
            >
                <Text
                    style={
                        styles.testErrorText
                    }
                >
                    Test API Error
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F7FA",
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F5F7FA",
    },

    statusText: {
        marginTop: 10,
        color: "#6B7280",
        fontSize: 14,
    },

    /* =========================
       HEADER
    ========================== */

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 18,
    },

    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#111827",
    },

    subtitle: {
        color: "#6B7280",
        marginTop: 4,
        fontSize: 14,
    },

    headerActions: {
        alignItems: "flex-end",
    },

    addButton: {
        backgroundColor: "#2563EB",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 9,
    },

    disabledButton: {
        opacity: 0.45,
    },

    addButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 13,
    },

    logoutButton: {
        marginTop: 8,
        paddingVertical: 4,
    },

    logoutText: {
        color: "#DC2626",
        fontSize: 13,
        fontWeight: "600",
    },

    /* =========================
       ERROR
    ========================== */

    errorBox: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        padding: 14,
        borderRadius: 12,
        marginBottom: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    errorContent: {
        flex: 1,
        paddingRight: 12,
    },

    errorTitle: {
        color: "#991B1B",
        fontWeight: "700",
        marginBottom: 3,
    },

    error: {
        color: "#DC2626",
        fontSize: 13,
    },

    retryButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    retry: {
        color: "#2563EB",
        fontWeight: "700",
    },

    /* =========================
       ACTIVE SHIFT
    ========================== */

    activeCard: {
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        borderRadius: 16,
        padding: 20,
        marginBottom: 18,
        alignItems: "center",
    },

    activeHeader: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    activeBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#DBEAFE",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 20,
    },

    activeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#16A34A",
        marginRight: 6,
    },

    activeBadgeText: {
        color: "#1D4ED8",
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.5,
    },

    activeDate: {
        color: "#6B7280",
        fontSize: 13,
        fontWeight: "600",
    },

    activeTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1D4ED8",
        marginTop: 15,
    },

    timer: {
        fontSize: 42,
        fontWeight: "700",
        color: "#111827",
        marginVertical: 8,
        fontVariant: ["tabular-nums"],
    },

    activeStarted: {
        color: "#6B7280",
        marginBottom: 18,
        fontSize: 13,
    },

    endButton: {
        backgroundColor: "#DC2626",
        height: 48,
        width: "100%",
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
    },

    buttonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 15,
    },

    /* =========================
       LIST
    ========================== */

    listContent: {
        paddingBottom: 10,
    },

    card: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },

    activeListCard: {
        borderColor: "#93C5FD",
        backgroundColor: "#F8FBFF",
    },

    completedCard: {
        backgroundColor: "#FFFFFF",
    },

    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },

    cardHeaderLeft: {
        flex: 1,
    },

    date: {
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 5,
    },

    cardTime: {
        color: "#4B5563",
        fontSize: 14,
    },

    /* =========================
       STATUS BADGES
    ========================== */

    statusScheduled: {
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 20,
        marginLeft: 8,
    },

    statusScheduledText: {
        color: "#92400E",
        fontSize: 11,
        fontWeight: "700",
    },

    statusActive: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#DCFCE7",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 20,
        marginLeft: 8,
    },

    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#16A34A",
        marginRight: 5,
    },

    statusActiveText: {
        color: "#166534",
        fontSize: 11,
        fontWeight: "700",
    },

    statusCompleted: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 20,
        marginLeft: 8,
    },

    statusCompletedText: {
        color: "#6B7280",
        fontSize: 11,
        fontWeight: "700",
    },

    /* =========================
       DETAILS
    ========================== */

    details: {
        flexDirection: "row",
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },

    detailItem: {
        flex: 1,
    },

    detailDivider: {
        width: 1,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 15,
    },

    detailLabel: {
        color: "#9CA3AF",
        fontSize: 12,
        marginBottom: 4,
    },

    detailValue: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "600",
    },

    /* =========================
       START
    ========================== */

    startButton: {
        backgroundColor: "#16A34A",
        height: 46,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 16,
    },

    disabledStartContainer: {
        backgroundColor: "#F3F4F6",
        padding: 11,
        borderRadius: 8,
        marginTop: 14,
    },

    disabledStartText: {
        color: "#9CA3AF",
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },

    /* =========================
       ACTIVE INFO
    ========================== */

    activeInfo: {
        backgroundColor: "#EFF6FF",
        padding: 11,
        borderRadius: 8,
        marginTop: 14,
    },

    activeInfoText: {
        color: "#1D4ED8",
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },

    /* =========================
       COMPLETED INFO
    ========================== */

    completedInfo: {
        backgroundColor: "#F9FAFB",
        padding: 11,
        borderRadius: 8,
        marginTop: 14,
    },

    completedInfoText: {
        color: "#6B7280",
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },

    /* =========================
       EMPTY
    ========================== */

    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
    },

    emptyIcon: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "#DBEAFE",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },

    emptyIconText: {
        color: "#2563EB",
        fontSize: 30,
        fontWeight: "400",
    },

    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 7,
        color: "#111827",
    },

    emptyText: {
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 18,
    },

    emptyButton: {
        backgroundColor: "#2563EB",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 9,
    },

    emptyButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
    },

    /* =========================
       TEST ERROR
    ========================== */

    testErrorButton: {
        alignItems: "center",
        paddingVertical: 10,
    },

    testErrorText: {
        color: "#9CA3AF",
        fontSize: 11,
    },
});
