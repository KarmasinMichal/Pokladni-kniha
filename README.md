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

## Kde jsou data

Zápisy se ukládají do `localStorage` prohlížeče, tedy jen na zařízení a v prohlížeči, kde aplikaci používáte. Nic se neodesílá na internet. Pokud vymažete data prohlížeče, zápisy zmizí, proto si v **Nastavení a záloha** pravidelně stahujte zálohu. Stejnou zálohou přenesete data do jiného zařízení.

## Technologie

Čisté HTML, CSS a JavaScript v jednom souboru, bez závislostí (jen písma z Google Fonts).
