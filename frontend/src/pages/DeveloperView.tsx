import React from 'react';

export const DeveloperView: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Model Evaluation / Developer View</h2>
      <div className="bg-white rounded shadow p-4 max-w-2xl">
        <p className="text-sm text-slate-500 mb-2">Technical metrics (developer/demo only):</p>
        <ul className="list-disc ml-5 text-sm text-slate-700">
          <li>Model: Random Forest (tuned)</li>
          <li>Accuracy: 85.98%</li>
          <li>Precision: 81.46%</li>
          <li>Adherent Recall: 84.01%</li>
          <li>Non-Adherent Recall: 87.29%</li>
          <li>F1 Score: 82.72%</li>
          <li>ROC-AUC: 93.13%</li>
        </ul>
        <div className="mt-4 text-xs text-slate-500">Note: These metrics are for development and evaluation only. They are not shown in standard clinical workflows.</div>
      </div>
    </div>
  );
};