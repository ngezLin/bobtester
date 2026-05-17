"use client";

interface Step {
  action: string;
  selector?: string;
  value?: string | number;
}

interface StepListProps {
  steps: Step[];
  savingSteps: boolean;
  onSave: () => void;
  onUpdateStep: (index: number, field: string, value: string) => void;
  onDeleteStep: (index: number) => void;
}

export default function StepList({
  steps,
  savingSteps,
  onSave,
  onUpdateStep,
  onDeleteStep,
}: StepListProps) {
  const parameterizeValue = (index: number) => {
    const varName = prompt("Enter variable name (e.g., username):", "");
    if (varName) {
      onUpdateStep(index, "value", `[${varName}]`);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Edit Test Steps</h2>
        <button
          onClick={onSave}
          disabled={savingSteps}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all"
        >
          {savingSteps ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">💡</span>

          <h3 className="text-sm font-semibold text-blue-400">
            Test Step Guide
          </h3>
        </div>

        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-400">
              goto
            </span>

            <p className="text-gray-400">
              Navigate to a target URL or webpage before executing actions.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400">
              click
            </span>

            <p className="text-gray-400">
              Click an element using a selector such as
              <code className="mx-1 text-white">id</code>,
              <code className="mx-1 text-white">.class</code>, or XPath.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-md bg-purple-500/10 px-2 py-1 text-xs font-bold text-purple-400">
              fill
            </span>

            <p className="text-gray-400">
              Input text or parameterized values into form fields.
            </p>
          </div>

          <div className="pt-3 border-t border-blue-500/10 text-gray-400">
            Use{" "}
            <code className="text-blue-400 font-semibold">[variable_name]</code>{" "}
            to parameterize values. Then add Assets with matching JSON keys to
            execute multiple datasets automatically.
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-gray-800/50 border border-gray-800 rounded-2xl p-4 space-y-3 relative group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase">
                Step {idx + 1}: {step.action}
              </span>
              <div className="flex items-center gap-4">
                {step.action === "fill" && (
                  <button
                    onClick={() => parameterizeValue(idx)}
                    className="
                    inline-flex items-center gap-1
                    rounded-lg
                    border border-blue-500/20
                    bg-blue-500/10
                    px-2.5 py-1
                    text-xs font-semibold
                    text-blue-400
                    hover:bg-blue-500/20
                    hover:border-blue-500/40
                    active:scale-95
                    transition-all duration-200
                    focus:outline-none
                    focus:ring-2 focus:ring-blue-400/30
                  "
                  >
                    <span>⚡</span>
                    <span>Parameterize</span>
                  </button>
                )}
                <button
                  onClick={() => onDeleteStep(idx)}
                  title="Delete Step"
                  className="
                    inline-flex items-center justify-center
                    w-8 h-8
                    rounded-lg
                    border border-transparent
                    text-gray-400
                    hover:text-red-400
                    hover:bg-red-500/10
                    hover:border-red-500/20
                    active:scale-95
                    transition-all duration-200
                    focus:outline-none
                    focus:ring-2 focus:ring-red-400/30
                  "
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase mb-1">
                  Selector
                </label>
                <input
                  type="text"
                  value={step.selector || ""}
                  onChange={(e) =>
                    onUpdateStep(idx, "selector", e.target.value)
                  }
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-300"
                />
              </div>
              {step.value !== undefined && (
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">
                    Value
                  </label>
                  <input
                    type="text"
                    value={step.value}
                    onChange={(e) => onUpdateStep(idx, "value", e.target.value)}
                    className={`w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono ${step.value.toString().startsWith("[") ? "text-blue-400 font-bold" : "text-gray-300"}`}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
