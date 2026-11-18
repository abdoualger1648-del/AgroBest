interface ImportMetaEnv {
  readonly VITE_EDITION?: string;
  readonly VITE_EMAIL_ADMIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
