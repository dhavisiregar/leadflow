import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UpgradePrompt({ feature = "Feature" }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/20 mb-4">
          <Lock size={32} className="text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {feature} not available
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
          Upgrade to a paid plan to access this feature and boost your business
          productivity.
        </p>
        <button
          onClick={() => navigate("/billing")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          View subscription plans
        </button>
      </div>
    </div>
  );
}
