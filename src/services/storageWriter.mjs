export function writeLocalJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (cause) {
    throw new Error(
      'Não foi possível salvar no armazenamento local. Seus dados continuam abertos nesta sessão; exporte um backup antes de fechar o aplicativo.',
      { cause }
    );
  }
}

export function readLocalJson(storage, key, fallback) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch (cause) {
    throw new Error('Não foi possível acessar o armazenamento local. Os dados não foram alterados.', { cause });
  }

  if (raw === null) {
    writeLocalJson(storage, key, fallback);
    return fallback;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new Error('Os dados locais do projeto estão inválidos e foram preservados. Não os substituí pelos modelos de demonstração.', { cause });
  }

  if (!Array.isArray(parsed)) {
    throw new Error('O armazenamento local contém um formato de projeto inválido e foi preservado.');
  }

  if (parsed.length === 0) {
    writeLocalJson(storage, key, fallback);
    return fallback;
  }

  return parsed;
}
