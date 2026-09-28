import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { createShift } from "../api/mockApi";

type Props = {
  onCreated: () => void;
  onCancel: () => void;
};

export default function CreateShiftScreen({
  onCreated,
  onCancel,
}: Props) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("30");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setError("");

    if (!date || !startTime || !endTime) {
      setError("Please fill in all required fields.");
      return;
    }

    const start = new Date(
      `${date}T${startTime}:00`
    );

    const end = new Date(
      `${date}T${endTime}:00`
    );

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setError(
        "Use date YYYY-MM-DD and time HH:MM."
      );
      return;
    }

    if (end <= start) {
      setError(
        "End time must be after start time."
      );
      return;
    }

    const breakValue = Number(breakMinutes);

    if (
      Number.isNaN(breakValue) ||
      breakValue < 0
    ) {
      setError(
        "Break must be a valid number."
      );
      return;
    }

    const duration =
      (end.getTime() - start.getTime()) / 60000;

    if (breakValue >= duration) {
      setError(
        "Break must be shorter than the shift."
      );
      return;
    }

    try {
      setSaving(true);

      await createShift({
        date,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        breakMinutes: breakValue,
      });

      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create shift."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          Create Shift
        </Text>

        <Text style={styles.label}>
          Date
        </Text>

        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
        />

        <Text style={styles.label}>
          Start time
        </Text>

        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={startTime}
          onChangeText={setStartTime}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>
          End time
        </Text>

        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={endTime}
          onChangeText={setEndTime}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>
          Break minutes
        </Text>

        <TextInput
          style={styles.input}
          placeholder="30"
          value={breakMinutes}
          onChangeText={setBreakMinutes}
          keyboardType="number-pad"
        />

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && styles.disabled,
          ]}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Create Shift
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={saving}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  content: {
    flex: 1,
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    height: 50,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 18,
  },

  error: {
    color: "#DC2626",
    marginBottom: 16,
  },

  saveButton: {
    height: 50,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  disabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  cancelButton: {
    alignItems: "center",
    padding: 16,
  },

  cancelText: {
    color: "#6B7280",
    fontWeight: "600",
  },
});
