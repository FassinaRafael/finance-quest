'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, RotateCcw, X, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { repository } from '@/lib/storage/repository';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose }) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const json = repository.exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-quest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setSuccessMessage('Backup JSON baixado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportCsv = () => {
    const csv = repository.exportTransactionsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-quest-transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSuccessMessage('Extrato CSV baixado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = repository.importAllData(content);
      if (success) {
        setSuccessMessage('Dados restaurados com sucesso!');
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 2000);
      } else {
        setErrorMessage('Arquivo de backup inválido ou corrompido.');
        setTimeout(() => setErrorMessage(null), 3500);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('⚠️ ATENÇÃO: Deseja realmente restaurar todos os dados para o padrão inicial? Esta ação não pode ser desfeita.')) {
      repository.resetToDefaults();
      setSuccessMessage('Aplicação restaurada para o padrão inicial!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              Backup & Gestão de Dados
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Banners */}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Export Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Exportar Dados</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJson}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex flex-col justify-between transition-colors"
              >
                <Download className="w-5 h-5 text-indigo-400 mb-2" />
                <div>
                  <span className="text-xs font-bold text-white block">Backup Completo</span>
                  <span className="text-[10px] text-slate-400">Arquivo .JSON</span>
                </div>
              </button>

              <button
                onClick={handleExportCsv}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex flex-col justify-between transition-colors"
              >
                <FileText className="w-5 h-5 text-emerald-400 mb-2" />
                <div>
                  <span className="text-xs font-bold text-white block">Extrato de Gastos</span>
                  <span className="text-[10px] text-slate-400">Arquivo .CSV</span>
                </div>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Restaurar Backup</h4>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Selecionar Arquivo .JSON de Backup</span>
            </button>
          </div>

          {/* Reset Section */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleResetData}
              className="w-full py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Redefinir Dados para o Padrão Inicial</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
