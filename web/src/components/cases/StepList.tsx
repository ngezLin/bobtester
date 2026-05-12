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
}

export default function StepList({ steps, savingSteps, onSave, onUpdateStep }: StepListProps) {
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
      
      <p className="text-sm text-gray-500 mb-8 bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl">
        💡 Use <code className="text-blue-400">[variable_name]</code> to parameterize values. 
        Then add Assets with matching JSON keys to run multiple data sets.
      </p>

      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={idx} className="bg-gray-800/50 border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase">Step {idx + 1}: {step.action}</span>
              {step.action === "fill" && (
                <button 
                  onClick={() => parameterizeValue(idx)}
                  className="text-[10px] text-blue-500 hover:underline font-bold"
                >
                  ⚡ Parameterize
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase mb-1">Selector</label>
                <input
                  type="text"
                  value={step.selector || ""}
                  onChange={(e) => onUpdateStep(idx, "selector", e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-300"
                />
              </div>
              {step.value !== undefined && (
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Value</label>
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
