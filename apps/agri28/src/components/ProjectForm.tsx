import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Field, inputClass } from './Field';
import { listWilayas } from '@/content/catalog';
import { monthLabel } from '@/domain/prompt';
import { usePreferences } from '@/store/preferences';
import {
  DEFAULT_UNIT,
  PROJECT_TYPES,
  SCALE_UNITS,
  WATER_SOURCES,
  type Project,
  type ProjectType,
  type ScaleUnit,
  type WaterSource,
} from '@/domain/types';
import type { ProjectInput } from '@/db/repositories/project';

interface ProjectFormProps {
  initial?: Project;
  submitLabel: string;
  onSubmit: (input: ProjectInput) => Promise<void> | void;
}

interface FormErrors {
  name?: string;
  scaleValue?: string;
  wilayaCode?: string;
  objective?: string;
}

export function ProjectForm({ initial, submitLabel, onSubmit }: ProjectFormProps) {
  const { t } = useTranslation(['project', 'common']);
  const lang = usePreferences((state) => state.lang);
  const wilayas = useMemo(() => listWilayas(lang), [lang]);

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<ProjectType>(initial?.type ?? 'ovin');
  const [typeOther, setTypeOther] = useState(initial?.typeOther ?? '');
  const [scaleValue, setScaleValue] = useState(String(initial?.scale.value ?? ''));
  const [scaleUnit, setScaleUnit] = useState<ScaleUnit>(initial?.scale.unit ?? DEFAULT_UNIT.ovin);
  const [wilayaCode, setWilayaCode] = useState(initial?.wilayaCode ?? '');
  const [commune, setCommune] = useState(initial?.commune ?? '');
  const [objective, setObjective] = useState(initial?.objective ?? '');
  const [horizonMonths, setHorizonMonths] = useState(String(initial?.horizonMonths ?? 12));
  const [budget, setBudget] = useState(
    initial?.budgetCeilingDA === undefined ? '' : String(initial.budgetCeilingDA),
  );
  const [waterSource, setWaterSource] = useState<WaterSource>(initial?.waterSource ?? 'inconnu');
  const [startMonth, setStartMonth] = useState(String(initial?.startMonth ?? ''));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedWilaya = wilayas.find((wilaya) => wilaya.code === wilayaCode);

  function changeType(next: ProjectType) {
    setType(next);
    // L'unité suit le type tant que l'utilisateur n'en a pas choisi une autre.
    if (!initial) setScaleUnit(DEFAULT_UNIT[next]);
  }

  function validate(): FormErrors {
    const found: FormErrors = {};
    if (!name.trim()) found.name = t('project:errors.nameRequired');
    if (!(Number(scaleValue) > 0)) found.scaleValue = t('project:errors.scalePositive');
    if (!wilayaCode) found.wilayaCode = t('project:errors.wilayaRequired');
    if (!objective.trim()) found.objective = t('project:errors.objectiveRequired');
    return found;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const input: ProjectInput = {
        name,
        type,
        scaleValue: Number(scaleValue),
        scaleUnit,
        wilayaCode,
        objective,
        horizonMonths: Number(horizonMonths) || 12,
        waterSource,
      };
      if (type === 'autre' && typeOther.trim()) input.typeOther = typeOther;
      if (startMonth) input.startMonth = Number(startMonth);
      if (commune.trim()) input.commune = commune;
      if (budget.trim() && Number(budget) > 0) input.budgetCeilingDA = Number(budget);

      await onSubmit(input);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <Field
        id="name"
        label={t('project:fields.name.label')}
        help={t('project:fields.name.help')}
        error={errors.name}
      >
        <input
          id="name"
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('project:fields.name.placeholder')}
          autoComplete="off"
        />
      </Field>

      <Field id="type" label={t('project:fields.type.label')}>
        <select
          id="type"
          className={inputClass}
          value={type}
          onChange={(event) => changeType(event.target.value as ProjectType)}
        >
          {PROJECT_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`project:types.${value}`)}
            </option>
          ))}
        </select>
      </Field>

      {type === 'autre' ? (
        <Field id="typeOther" label={t('project:typeOther.label')}>
          <input
            id="typeOther"
            className={inputClass}
            value={typeOther}
            onChange={(event) => setTypeOther(event.target.value)}
            placeholder={t('project:typeOther.placeholder')}
          />
        </Field>
      ) : null}

      <div className="flex gap-3">
        <div className="flex-1">
          <Field
            id="scaleValue"
            label={t('project:fields.scale.label')}
            help={t('project:fields.scale.help')}
            error={errors.scaleValue}
          >
            <input
              id="scaleValue"
              className={inputClass}
              value={scaleValue}
              onChange={(event) => setScaleValue(event.target.value)}
              inputMode="numeric"
              type="number"
              min="0"
            />
          </Field>
        </div>
        <div className="w-36">
          <Field id="scaleUnit" label={t('project:fields.unit.label')}>
            <select
              id="scaleUnit"
              className={inputClass}
              value={scaleUnit}
              onChange={(event) => setScaleUnit(event.target.value as ScaleUnit)}
            >
              {SCALE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`project:units.${unit}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <Field id="wilayaCode" label={t('project:fields.wilaya.label')} error={errors.wilayaCode}>
        <select
          id="wilayaCode"
          className={inputClass}
          value={wilayaCode}
          onChange={(event) => setWilayaCode(event.target.value)}
        >
          <option value="">{t('project:fields.wilaya.placeholder')}</option>
          {wilayas.map((wilaya) => (
            <option key={wilaya.code} value={wilaya.code}>
              {wilaya.code} — {lang === 'ar' ? wilaya.name_ar : wilaya.name_fr}
            </option>
          ))}
        </select>
      </Field>

      {selectedWilaya?.new2026 ? (
        <p className="-mt-2 mb-4 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          {t('project:newWilaya', {
            mother: selectedWilaya.motherCode ?? '—',
          })}
        </p>
      ) : null}

      <Field
        id="commune"
        label={t('project:fields.commune.label')}
        optional={t('project:fields.commune.optional')}
      >
        <input
          id="commune"
          className={inputClass}
          value={commune}
          onChange={(event) => setCommune(event.target.value)}
        />
      </Field>

      <Field
        id="objective"
        label={t('project:fields.objective.label')}
        help={t('project:fields.objective.help')}
        error={errors.objective}
      >
        <textarea
          id="objective"
          className={`${inputClass} min-h-24`}
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          placeholder={t('project:fields.objective.placeholder')}
          rows={3}
        />
      </Field>

      <div className="flex gap-3">
        <div className="flex-1">
          <Field id="horizonMonths" label={t('project:fields.horizon.label')}>
            <input
              id="horizonMonths"
              className={inputClass}
              value={horizonMonths}
              onChange={(event) => setHorizonMonths(event.target.value)}
              inputMode="numeric"
              type="number"
              min="1"
              max="60"
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field
            id="budget"
            label={t('project:fields.budget.label')}
            optional={t('project:fields.budget.optional')}
          >
            <input
              id="budget"
              className={inputClass}
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              inputMode="numeric"
              type="number"
              min="0"
            />
          </Field>
        </div>
      </div>

      <Field id="startMonth" label={t('project:fields.startMonth.label')}>
        <select
          id="startMonth"
          className={inputClass}
          value={startMonth}
          onChange={(event) => setStartMonth(event.target.value)}
        >
          <option value="">{t('project:fields.startMonth.any')}</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
            <option key={month} value={month}>
              {monthLabel(month, lang)}
            </option>
          ))}
        </select>
      </Field>

      <Field id="waterSource" label={t('project:fields.water.label')}>
        <select
          id="waterSource"
          className={inputClass}
          value={waterSource}
          onChange={(event) => setWaterSource(event.target.value as WaterSource)}
        >
          {WATER_SOURCES.map((source) => (
            <option key={source} value={source}>
              {t(`project:water.${source}`)}
            </option>
          ))}
        </select>
      </Field>

      <Button type="submit" block disabled={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
