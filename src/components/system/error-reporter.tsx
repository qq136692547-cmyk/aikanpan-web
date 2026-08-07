"use client";

import { useEffect } from "react";
import { installErrorReporting } from "@/lib/error-report";

export function ErrorReporter() {
  useEffect(() => installErrorReporting(), []);
  return null;
}
