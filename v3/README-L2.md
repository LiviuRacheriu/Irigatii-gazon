# L2 — editor poligonal, numai local

Cod: ramura `develop/l2-polygons`, baza `develop/l1-foundation` la `275aa52`.
Aplicația originală și ramurile `main`, `gh-pages`, `develop/l1-foundation` nu se modifică. Nu există automatizare de publicare L2.

## Rulare și verificare

Din `v3/`, cu dependențele L1 deja instalate:

```sh
pnpm test
pnpm build
pnpm preview:l2
```

Preview: http://127.0.0.1:4174/ (numai loopback). Build: `dist-l2/`, separat de `dist/` L1. Căile relative permit servirea într-un subdirector ulterior. `pnpm dev` folosește sursele L2.

## Utilizare

- Proiect nou: schiță cu zero vârfuri. Atinge planul în modul „Adaugă prin atingere” sau adaugă numeric.
- „Selectează / mută”: atinge un vârf și trage. Pointer capture păstrează gestul; pointercancel revine la geometria anterioară. Un gest complet produce un singur pas undo.
- X crește spre dreapta, Y în sus. Coordonate −10.000…10.000 m, maximum 3 zecimale. Atingerile se rotunjesc la milimetru; intrările numerice prea precise se resping.
- Folosește lista „Vârf selectat” pentru punctele apropiate; coordonatele valide se aplică imediat în SVG. Un câmp incomplet sau invalid nu înlocuiește ultima coordonată acceptată.
- Zoom și deplasare prin butoane; „Încadrează” include toate vârfurile. Zoomul paginii rămâne disponibil în afara planului.
- Închidere explicită pentru 3–50 de vârfuri. Duplicatele, laturile nule, intersecțiile, suprapunerile și aria nulă blochează finalizarea. Formele concave sunt permise.
- Editările unei forme închise sunt acceptate numai dacă păstrează validitatea. Pentru o transformare în mai mulți pași poți redeschide conturul. Schițele pot fi geometric invalide, dar au numai coordonate valide și maximum 50 de vârfuri.
- Ștergerea cere confirmare în interfață. Dintr-un triunghi închis nu se poate șterge un vârf; redeschide conturul înainte. Operația poate fi anulată.
- Lungimi individuale în SVG și în lista expandabilă. Conturul deschis afișează lungimea traseului și nu pretinde o suprafață finalizată.
- Undo/redo: ultimele 100 de operații geometrice pe proiect, inclusiv la schimbarea proiectului. Istoricul este în memorie; la reîncărcare se păstrează geometria, nu istoricul. Numele și importul nu intră în istoricul geometric.

## Persistență și compatibilitate

- Bază nouă: `irigatii-gazon-v3-l2`, versiunea IndexedDB 1, stores `projects` și `meta`.
- La prima inițializare se citește baza L1 `irigatii-gazon-v3-l1` exclusiv readonly. Fiecare dreptunghi devine un poligon închis (0,0), (lungime,0), (lungime,lățime), (0,lățime); identitatea, numele și data se păstrează.
- Migrarea și marcajul inițializării sunt atomice. Un proiect L1 invalid oprește întreaga migrare; nu se pornește cu date goale peste o sursă invalidă. Se poate reîncerca după corectarea sursei. Baza L1 nu este modificată sau ștearsă.
- Migrarea automată se face o singură dată, pentru aceeași origine/browser. Proiectele L1 adăugate ulterior se pot transfera prin export/import. Preview-ul de pe portul 4174 nu poate citi baza de pe portul 4173 sau de pe GitHub Pages.
- Salvări serializate, tranzacționale; schițele se salvează după fiecare operație acceptată. Geometria temporară din timpul tragerii nu se salvează până la ridicarea degetului. Așteaptă mesajul „Salvat” înainte să închizi fila.
- O revizie în IndexedDB detectează o a doua filă care salvează o copie veche. Scrierea este refuzată și utilizatorul este îndrumat să exporte și să reîncarce; nu există rezolvare automată a conflictelor.
- Salvarea nu șterge proiectele omise dintr-un instantaneu; L2 nu are ștergere de proiecte.
- JSON exportat: `format: "irigatii-gazon"`, `version: 2`, `exportedAt`, `projects`. Proiectele au `shape: {vertices: [{x,y}], closed}`. Sunt acceptate importuri v1 (L1) și v2 (L2), maximum 2 MB / 1.000 proiecte per fișier. Validarea este integrală înainte de import; fiecare copie are un ID nou. JSON v2 nu este compatibil cu importatorul L1.
- Nu există sincronizare cloud sau instalare offline. Exportă copii de siguranță. Ștergerea datelor browserului șterge și baza L2.

## Plan de testare pe iPhone Safari

Preview-ul loopback se deschide pe acest calculator. Pentru iPhone este necesară ulterior aprobarea unei metode de acces: server în rețeaua locală sau staging HTTPS separat. Nu utiliza `localhost:4174` pe iPhone pentru serverul de pe PC.

1. În Safari normal, importă un export L1 cu două proiecte. Verifică numele, dimensiunile transformate, suprafața și perimetrul; originalele L1 rămân independente.
2. Desenează un triunghi și o formă concavă cu 6 vârfuri. Verifică închiderea explicită și toate lungimile. Triunghi (0,0), (4,0), (0,3): arie 6 m², perimetru 12 m.
3. Selectează și trage vârfuri. Verifică actualizarea câmpurilor X/Y și un singur Undo per gest; Refă trebuie să restabilească rezultatul.
4. Editează X/Y cu virgulă, punct, coordonate negative (lipire dacă tastatura nu oferă minus), trei și patru zecimale, câmp gol și valori în afara limitelor. Corectează câmpurile înainte de schimbarea proiectului.
5. Desenează papion, vârfuri duplicate și puncte coliniare. Confirmă că nu se pot finaliza. Reîncarcă după „Salvat” și verifică recuperarea schiței, apoi corecteaz-o.
6. Încearcă o editare sau o ștergere care invalidează un contur finalizat. Verifică mesajul, păstrarea geometriei, confirmarea și anularea ștergerii.
7. Creează 50 de vârfuri și încearcă al 51-lea. Verifică selecția numerică pentru vârfuri apropiate și zoom/încadrare.
8. Schimbă proiectul și revino: undo/redo se păstrează în sesiune. Reîncarcă: geometria și starea deschis/închis persistă, istoricul se resetează.
9. Exportă JSON în Files, importă-l de două ori, verifică toate copiile și lipsa suprascrierii. Încearcă JSON invalid și v2 cu o formă închisă invalidă: importul complet trebuie respins.
10. Repetă în portret și peisaj, cu tastatura afișată, scroll și zoom. Verifică safe-area și țintele tactile. Testează două file: a doua salvare învechită trebuie refuzată.

## Limite

Un singur contur simplu per proiect; fără găuri, rotație, snapping, inserare pe latură sau gesturi multitouch pentru zoom. Coordonatele sunt metrice locale, nu GPS. Etichetele se pot suprapune la vârfuri foarte apropiate: lista laturilor oferă valorile complete. Testele desktop nu certifică comportamentul Safari/iOS real.

## Verificări locale efectuate

- 111 teste trecute în 7 fișiere: geometrie și validare L1/L2, concavitate, intersecții și suprapuneri, limite, undo/redo, încadrare SVG, import/export, migrare și tranzacții IndexedDB, conflicte între file.
- TypeScript: reușit. Vite build: reușit, în `dist-l2/`.
- Browser desktop: triunghi numeric 6 m² / 12 m, închidere, editare invalidă respinsă, drag sincronizat numeric, un Undo pentru drag, undo/redo finalizare, refuz ștergere invalidă și persistență după reload.
- Browser desktop: trei vârfuri adăugate prin pointer pe SVG și recuperate după reload ca schiță deschisă. Fără erori în consola browserului.
- Layout verificat în ferestre 390×844 și 844×390, fără depășire orizontală. Aceste verificări nu emulează motorul Safari sau tastatura iOS.

## Fișiere modificate

Existente: `.gitignore`, `README.md`, `index.html` (doar cel din `v3`), `package.json`, `vite.config.ts`, `src/main.tsx`, `src/style.css`.

Noi: `README-L2.md`, `src/PolygonEditor.tsx`, `src/polygon.ts`, `src/viewport.ts`, `src/history.ts`, `src/projects.ts`, `src/l2Storage.ts`, plus testele `polygon.test.ts`, `viewport.test.ts`, `history.test.ts`, `projects.test.ts`, `l2Storage.test.ts` din `src/`.

Modulele L1 `src/domain.ts` și `src/storage.ts`, testele lor și fișierul de dependențe blocat rămân neschimbate. Nu au fost adăugate dependențe.

## Pachet local complet pentru publicare separată

După build, din `v3/`:

```sh
node scripts/pages-local.mjs prepare
node scripts/pages-local.mjs check
node scripts/pages-local.mjs serve
```

Pregătirea creează `.staging/l2-publication/site/` și refuză suprascrierea unui pachet existent. Copiază exact fișierele din commitul local `gh-pages` (aplicația originală la rădăcină și L1 în `staging/`) și adaugă build-ul L2 în `staging-l2/`. Manifestul de lângă directorul site reține commiturile de bază și sursă; nu face parte din site.

Verificarea compară fiecare fișier preexistent cu Git și testează răspunsurile HTTP, tipurile MIME și conținutul pentru cele trei pagini și referințele JS/CSS. Preview-ul complet este la http://127.0.0.1:4175/Irigatii-gazon/; L2 la http://127.0.0.1:4175/Irigatii-gazon/staging-l2/. `base: './'` rezolvă asseturile în subdirectorul fiecărei aplicații; se folosesc adrese cu slash final.

Acest script nu creează commituri, nu face push, deploy și nu schimbă Pages. Pachetul ignorat Git este doar pentru revizuire. Fișier nou suplimentar: `scripts/pages-local.mjs`.

Pe aceeași origine, L1 și L2 folosesc baze IndexedDB separate. Preview-ul complet de pe portul 4175 are date diferite de preview-urile de pe 4173/4174. La o publicare ulterioară pe GitHub Pages, inițializarea L2 va copia o singură dată baza L1 a acelei origini. Orice publicare înlocuiește pachetul întregului site: înaintea ei trebuie reverificat că ramura remote `gh-pages` nu s-a schimbat față de manifest.
