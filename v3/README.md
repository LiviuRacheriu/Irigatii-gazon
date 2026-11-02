# Irigații Gazon 3.0 — L1

Aplicație React + TypeScript + Vite, izolată complet de `../index.html`.
Nu există configurare de deploy sau modificări GitHub Pages.

## Rulare

Node 22.12+ sau 24 și pnpm 11. Din directorul `v3`:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm staging
```

Staging local: http://127.0.0.1:4173, servit exclusiv din `v3/dist`.
Pentru dezvoltare: `pnpm dev`. Nu servi rădăcina repository-ului ca staging.
Orice staging extern, push, merge, publicare Alpha sau modificare Pages necesită aprobarea proprietarului.

## Comportament L1

- Proiecte multiple; câte un dreptunghi pe proiect, nume de maximum 80 de caractere.
- Dimensiuni 0,001–10.000 m, maximum trei zecimale, separator punct sau virgulă. Sunt respinse exponenți, unități, valori negative, zero și câmpuri goale.
- Editările valide se aplică imediat; un formular invalid păstrează ultimul proiect valid. Corectează câmpurile înainte să schimbi proiectul sau să exporți.
- Suprafață, perimetru și SVG proporțional. Rapoartele extreme pot produce o linie foarte subțire.
- IndexedDB dedicat: `irigatii-gazon-v3-l1`, versiunea 1. Salvări serializate și tranzacții atomice; erorile sunt afișate în interfață. La încărcare eșuată nu se inițializează și nu se suprascrie baza.
- JSON: `format: "irigatii-gazon"`, `version: 1`, `exportedAt`, `projects`. Importul validează întregul fișier înainte de modificare, maximum 2 MB și 1.000 de proiecte per fișier. Fiecare import creează identificatori noi, inclusiv pentru importuri repetate. Exportul include toate proiectele valide.
- Datele rămân în browser, separat pentru fiecare origine. Exportă înainte să schimbi originea, browserul sau dispozitivul. Nu există sincronizare cloud.

## Safari / verificare manuală

Build țintit Safari 15.6+, controale de minimum 48 px, inputuri de 16 px, tastatură zecimală, safe-area și zoom permis. IndexedDB și descărcările pot depinde de setările browserului și de spațiul disponibil.

Testele automate folosesc Vitest și fake-indexeddb. Acestea verifică geometria, validarea, transferul JSON, redeschiderea bazei și anularea tranzacțiilor. Nu înlocuiesc verificarea pe iPhone real, care rămâne de efectuat:

1. Creează două proiecte, editează dimensiuni cu virgulă și punct; verifică suprafața și perimetrul.
2. Încearcă zero, text, câmp gol și patru zecimale; verifică mesajele și păstrarea valorilor valide.
3. Reîncarcă pagina după mesajul „Salvat”; verifică ambele proiecte.
4. Exportă în Files, apoi importă de două ori; verifică păstrarea originalelor și copiile noi.
5. Verifică portret/peisaj, zoom, tastatură și navigarea tactilă.

Nu este instalat un service worker; funcționarea offline după închiderea paginii nu face parte din L1.
