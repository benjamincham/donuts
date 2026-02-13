import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField } from './ui/FormField';
import { Button } from './ui/Button';
import type { CreateKnowledgeBaseInput } from '../types/knowledge-base';

interface KnowledgeBaseFormProps {
  onSubmit: (data: CreateKnowledgeBaseInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const KnowledgeBaseForm: React.FC<KnowledgeBaseFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateKnowledgeBaseInput>({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('knowledgeBase.validationNameRequired');
    } else if (formData.name.length > 100) {
      newErrors.name = t('knowledgeBase.validationNameTooLong');
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = t('knowledgeBase.validationDescriptionTooLong');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name field */}
      <FormField
        label={t('knowledgeBase.nameLabel')}
        htmlFor="kb-name"
        description={t('knowledgeBase.nameDescription')}
        error={errors.name}
        required
      >
        <input
          type="text"
          id="kb-name"
          value={formData.name}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, name: e.target.value }));
            if (errors.name) {
              setErrors((prev) => ({ ...prev, name: '' }));
            }
          }}
          disabled={isLoading}
          placeholder={t('knowledgeBase.namePlaceholder')}
          className={`w-full px-4 py-3 border rounded-input bg-surface-primary text-fg-default focus:ring-2 focus:ring-border-focus focus:border-transparent disabled:bg-surface-secondary disabled:cursor-not-allowed ${
            errors.name ? 'border-feedback-error' : 'border-border'
          }`}
        />
      </FormField>

      {/* Description field */}
      <FormField
        label={t('knowledgeBase.descriptionLabel')}
        htmlFor="kb-description"
        description={t('knowledgeBase.descriptionDescription')}
        error={errors.description}
      >
        <textarea
          id="kb-description"
          value={formData.description}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, description: e.target.value }));
            if (errors.description) {
              setErrors((prev) => ({ ...prev, description: '' }));
            }
          }}
          disabled={isLoading}
          placeholder={t('knowledgeBase.descriptionPlaceholder')}
          rows={4}
          className={`w-full px-4 py-3 border rounded-input bg-surface-primary text-fg-default focus:ring-2 focus:ring-border-focus focus:border-transparent disabled:bg-surface-secondary disabled:cursor-not-allowed resize-none ${
            errors.description ? 'border-feedback-error' : 'border-border'
          }`}
        />
      </FormField>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isLoading}>
          {t('knowledgeBase.create')}
        </Button>
      </div>
    </form>
  );
};
