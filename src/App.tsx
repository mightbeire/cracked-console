import { useEffect, useState } from "react";
import { AppShell } from "./app/AppShell";
import { SetupView } from "./features/setup/SetupView";
import { getImportedConfigSummary } from "./engine/data/configImportRepository";
import type { ConfigSummary } from "./engine/config/types";

type BootState =
  | { status: "LOADING" }
  | { status: "UNCONFIGURED" }
  | { status: "CONFIGURED"; summary: ConfigSummary }
  | { status: "ERROR"; message: string };

export default function App() {
  const [state, setState] = useState<BootState>({ status: "LOADING" });

  async function refresh() {
    try {
      const summary = await getImportedConfigSummary();
      setState(summary
        ? { status: "CONFIGURED", summary }
        : { status: "UNCONFIGURED" });
    } catch (error: unknown) {
      setState({
        status: "ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (state.status === "LOADING") {
    return (
      <main className="community-stage">
        <p className="eyebrow">CRACKED CONSOLE / COMMUNITY EDITION</p>
        <h1>Opening local workspace...</h1>
      </main>
    );
  }

  if (state.status === "UNCONFIGURED") {
    return <SetupView onConfigured={refresh} />;
  }

  if (state.status === "ERROR") {
    return (
      <main className="community-stage">
        <p className="eyebrow">STARTUP ERROR</p>
        <h1>Cracked Console could not read the local plan.</h1>
        <p>{state.message}</p>
      </main>
    );
  }

  return <AppShell planSummary={state.summary} />;
}
