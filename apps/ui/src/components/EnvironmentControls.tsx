import { useEffect, useState } from "react";

interface EnvironmentControlsProps {
  readonly temperature: number;
  readonly pressureAtm: number;
  readonly ph: number;
  onCommit(environment: { temperature: number; pressureAtm: number; ph: number }): void;
}

export function EnvironmentControls({ temperature, pressureAtm, ph, onCommit }: EnvironmentControlsProps) {
  const [draftTemperature, setDraftTemperature] = useState(temperature);
  const [draftPressure, setDraftPressure] = useState(pressureAtm);
  const [draftPh, setDraftPh] = useState(ph);

  useEffect(() => {
    setDraftTemperature(temperature);
  }, [temperature]);

  useEffect(() => {
    setDraftPressure(pressureAtm);
  }, [pressureAtm]);

  useEffect(() => {
    setDraftPh(ph);
  }, [ph]);

  const commit = () => {
    onCommit({
      temperature: draftTemperature,
      pressureAtm: draftPressure,
      ph: draftPh,
    });
  };

  return (
    <form className="environment-form" onSubmit={(event) => event.preventDefault()}>
      <label>
        Temperature (K)
        <input
          type="range"
          min={273}
          max={350}
          step={1}
          value={draftTemperature}
          onChange={(event) => setDraftTemperature(Number(event.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
        />
        <span>{draftTemperature.toFixed(0)} K</span>
      </label>

      <label>
        Pressure (atm)
        <input
          type="range"
          min={0.8}
          max={1.5}
          step={0.01}
          value={draftPressure}
          onChange={(event) => setDraftPressure(Number(event.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
        />
        <span>{draftPressure.toFixed(2)} atm</span>
      </label>

      <label>
        pH
        <input
          type="range"
          min={0}
          max={14}
          step={0.1}
          value={draftPh}
          onChange={(event) => setDraftPh(Number(event.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
        />
        <span>{draftPh.toFixed(1)}</span>
      </label>
    </form>
  );
}
