# Apps móveis (Android e iOS)

Há dois caminhos. Escolha conforme a necessidade.

## Opção A — PWA (mais simples, sem loja)

O app **já é um PWA instalável**. Sem build nativo, sem loja:

- **Android (Chrome):** abra a URL do app → menu ⋮ → **Instalar aplicativo**.
- **iOS (Safari):** abra a URL → botão Compartilhar → **Adicionar à Tela de Início**.

Vantagens: instalação instantânea, atualização automática, funciona offline (shell + cache).
É o caminho recomendado para começar.

## Opção B — App nativo com Capacitor (para publicar nas lojas)

Gera **APK/AAB** (Android) e **IPA** (iOS) a partir do mesmo código.

### Pré-requisitos

- **Android:** [Android Studio](https://developer.android.com/studio) instalado (inclui SDK + Gradle).
- **iOS:** **macOS** + **Xcode** + conta **Apple Developer** (US$ 99/ano). iOS **não** compila no Windows/Linux.

### Passos (Android)

```bash
# 1. Build web
npm run build

# 2. Adicionar a plataforma (só na primeira vez)
npx cap add android

# 3. Sincronizar o build com o projeto nativo
npx cap sync android

# 4. Abrir no Android Studio
npx cap open android
```

No Android Studio:

- **Run** para testar no emulador/dispositivo.
- **Build › Build Bundle(s) / APK(s) › Build APK(s)** → gera o **APK** (instalação direta).
- **Build › Generate Signed Bundle / APK** → gera o **AAB assinado** (exigido pela Play Store).
  - Crie um *keystore* na primeira vez e **guarde-o com segurança** (sem ele não há como atualizar o app na loja).

### Passos (iOS — em macOS)

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

No Xcode: selecione o time de desenvolvimento (Apple Developer), ajuste o *bundle id*
(`br.com.kairostelecom.frota`) e use **Product › Archive** para gerar o **IPA** e enviar à App Store.

### Atualizações do app nativo

A cada mudança no código web:

```bash
npm run build && npx cap sync
```

e gere um novo build no Android Studio / Xcode.

### Ícones e splash

Os ícones em `public/icons/` já seguem a identidade Kairos. Para os ícones nativos,
o Android Studio/Xcode permite importar; ou use o pacote `@capacitor/assets`:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#16266B" --splashBackgroundColor "#16266B"
```

## Observação honesta sobre builds

Não é possível gerar um **APK assinado** ou um **IPA** sem o toolchain nativo (Android SDK/Gradle ou Xcode)
e sem as suas credenciais/certificados — isso vale para qualquer ferramenta. Este projeto entrega tudo
**pré-configurado** para que o build seja apenas abrir no Android Studio/Xcode e clicar em gerar.
