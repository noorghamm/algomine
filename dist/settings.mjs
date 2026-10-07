// Settings dialog: theme, motion, hints, sound, progress export/import/reset, keyboard help.
import { $, toast } from './ui.mjs';
import { sound } from './sound.mjs';
import { progress, setSetting, resetProgress, exportProgress, importProgress } from './progress.mjs';

export function applyTheme(theme) {
  const resolved =
    theme === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
  document.documentElement.dataset.theme = resolved;
  document
    .querySelector('meta[name=theme-color]')
    ?.setAttribute('content', resolved === 'light' ? '#eef2e4' : '#171d17');
}

export function initSettings() {
  const dialog = $('settingsDialog');
  $('closeSettings').onclick = () => dialog.close();
  for (const input of dialog.querySelectorAll('[name=theme]')) {
    input.checked = input.value === progress.settings.theme;
    input.onchange = () => {
      setSetting('theme', input.value);
      applyTheme(input.value);
    };
  }
  $('settingMotion').checked = progress.settings.motion === 'reduce';
  $('settingMotion').onchange = e => {
    setSetting('motion', e.target.checked ? 'reduce' : 'auto');
    document.documentElement.classList.toggle('reduce-motion', e.target.checked);
  };
  document.documentElement.classList.toggle('reduce-motion', progress.settings.motion === 'reduce');
  $('settingSound').checked = progress.settings.sound;
  $('settingSound').onchange = e => {
    const on = sound.set(e.target.checked);
    setSetting('sound', on);
    $('sound').classList.toggle('on', on);
  };
  $('settingHints').checked = progress.settings.hints !== false;
  $('settingHints').onchange = e => setSetting('hints', e.target.checked);
  $('exportProgress').onclick = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algomine-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('importProgress').onchange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      importProgress(await file.text());
      toast('Progress imported.', 'good');
      dialog.close();
    } catch (error) {
      toast(error.message || 'Could not import that file.', 'bad');
    }
    e.target.value = '';
  };
  $('resetProgress').onclick = () => {
    if ($('resetProgress').dataset.armed) {
      resetProgress();
      delete $('resetProgress').dataset.armed;
      $('resetProgress').textContent = 'RESET ALL PROGRESS';
      toast('Progress reset. Fresh world.');
      dialog.close();
    } else {
      $('resetProgress').dataset.armed = '1';
      $('resetProgress').textContent = 'CLICK AGAIN TO CONFIRM';
      setTimeout(() => {
        delete $('resetProgress').dataset.armed;
        $('resetProgress').textContent = 'RESET ALL PROGRESS';
      }, 4000);
    }
  };
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (progress.settings.theme === 'auto') applyTheme('auto');
  });
}

export function openSettings(section) {
  $('settingSound').checked = progress.settings.sound;
  const dialog = $('settingsDialog');
  dialog.showModal();
  if (section === 'keys') $('keyboardHelp').scrollIntoView();
}
