import { config, configWarnings } from "@/lib/config";

/**
 * Warn when the configured network disagrees with the endpoints actually being
 * queried. This failure mode is silent and misleading rather than loud: pages
 * render fine with data from one network while simulation signs against
 * another's passphrase, so every number on screen looks plausible.
 *
 * Renders nothing on a coherent deployment, which is the common case.
 */
export default function ConfigWarning() {
  const warnings = configWarnings(config);
  if (warnings.length === 0) return null;

  return (
    <div className="border-b border-prism-red/30 bg-prism-red/10 px-4 py-2">
      <div className="max-w-7xl mx-auto text-xs text-prism-red space-y-1">
        {warnings.map((warning) => (
          <p key={warning}>
            <span className="font-bold">Config mismatch:</span> {warning}
          </p>
        ))}
      </div>
    </div>
  );
}
