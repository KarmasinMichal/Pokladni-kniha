# Pokladní kniha

Jednoduchá webová pokladní kniha pro evidenci hotovostních příjmů a výdajů. Běží celá v prohlížeči, nepotřebuje server ani instalaci.

## Co umí

- Zápis příjmů a výdajů (datum, číslo dokladu, popis, částka)
- Automatické číslování dokladů (`P-001/2026`, `V-001/2026`)
- Průběžný zůstatek, součty za období a aktuální stav pokladny
- Filtrování podle roku a měsíce
- Tisk přehledné tabulky na A4 s hlavičkou firmy a místem na podpisy (lze uložit i jako PDF)
- Záloha a obnovení dat do souboru JSON

## Spuštění

Stačí otevřít `index.html` v prohlížeči.

### Zveřejnění přes GitHub Pages

1. Nahrajte soubory do repozitáře na GitHubu.
2. V repozitáři otevřete **Settings → Pages**.
3. U **Source** zvolte **Deploy from a branch**, větev `main` a složku `/ (root)`.
4. Po chvíli bude aplikace dostupná na `https://<uživatel>.github.io/<repozitář>/`.

## Přístupy

- **Správce** (účet nastavený v `OWNER_EMAIL` v `index.html` a v pravidlech Firestore) může zapisovat, upravovat, mazat a měnit nastavení.
- **Čtenáři** se přihlásí vlastním Google účtem. Správce jejich e-maily zapíše v aplikaci do části *Nastavení a záloha → Kdo může knihu číst*. Čtenáři vidí knihu a můžou ji tisknout, ale nic nezmění.
- Kdo není přihlášený nebo není na seznamu, neuvidí nic.

## Kde jsou data

Zápisy jsou v databázi Firebase (Firestore, umístění Frankfurt), v jedné společné knize `books/main`. Oprávnění hlídají pravidla databáze, ne jen vzhled aplikace, takže čtenář nemůže zapisovat ani přes vývojářské nástroje.

Konfigurace Firebase v `index.html` (apiKey apod.) není tajná, u webových aplikací je veřejná vždy.

Přihlášení funguje jen z adres povolených ve Firebase (Authentication → Settings → Authorized domains): `localhost` a `karmasinmichal.github.io`.

## Technologie

Čisté HTML, CSS a JavaScript v jednom souboru. Firebase SDK a písma se načítají z CDN.
