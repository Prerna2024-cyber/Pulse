import { useState } from 'react';
import { SENSITIVITY_PRESETS, matchPreset, sensitivityMeaning } from '../../significanceCopy.js';

// The one setting Pulse has: how much of a move counts as worth telling you
// about. It lives inside the What Changed panel rather than on a settings
// screen, because that's the panel it changes — you adjust it while looking at
// the result, and there's nothing else a settings screen would hold.
//
// Three presets, not a number field. The honest question is "how much do you
// want to hear from Pulse", and a person can answer that immediately; asking
// them to pick a percentage asks them to invent one. It also means every value
// that can be sent is one the server already accepts — the range check in
// lib/thresholds.js exists for everything that isn't these buttons.
export default function SensitivityControl({ thresholds, onSave }) {
  const [saving, setSaving] = useState(null); // the preset id in flight
  const [error, setError] = useState(null);

  const active = matchPreset(thresholds);

  async function handlePick(preset) {
    if (saving || preset.id === active?.id) return;
    setSaving(preset.id);
    setError(null);
    try {
      await onSave({
        priceThresholdPercent: preset.priceThresholdPercent,
        volumeMultiplier: preset.volumeMultiplier,
      });
    } catch (err) {
      // The server range-checks these, and there's no reason a preset should
      // fail it — but if one does, saying so beats a row of buttons that
      // silently didn't take.
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="sensitivity">
      {/* A group rather than loose buttons: the choice is one control, and a
          screen reader should hear it named before hearing three options. */}
      <div className="sensitivity-options" role="group" aria-label="How much should Pulse flag?">
        {SENSITIVITY_PRESETS.map((preset) => {
          const isActive = preset.id === active?.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`sensitivity-option${isActive ? ' sensitivity-option-on' : ''}`}
              // aria-pressed rather than a disabled active button: the current
              // choice stays focusable, so a keyboard user can tab across the
              // row and hear where they are.
              aria-pressed={isActive}
              disabled={Boolean(saving)}
              onClick={() => handlePick(preset)}
            >
              <span className="sensitivity-option-label">{preset.label}</span>
              <span className="sensitivity-option-detail">
                {preset.priceThresholdPercent}% · {preset.volumeMultiplier}× volume
              </span>
            </button>
          );
        })}
      </div>

      {/* Always present, and it's the plain-language half of the control:
          the numbers on the buttons say what the rule is, this says what
          living with it feels like. aria-live so the change is announced —
          the buttons' own state changing doesn't say what it now means. */}
      <p className="sensitivity-meaning muted small" aria-live="polite">
        {saving ? 'Saving…' : sensitivityMeaning(thresholds)}
      </p>

      {error && <p className="sensitivity-error error-text small">Couldn't save that — {error}</p>}
    </div>
  );
}
