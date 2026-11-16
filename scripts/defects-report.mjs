// Publica el estado de los defectos conocidos (DEF-xxx) a partir de los reportes JUnit del mismo run.
// En GitHub Actions escribe la sección "Defectos abiertos" en GITHUB_STEP_SUMMARY y emite una annotation por defecto;
// en local solo imprime la sección por consola.
// Uso: node scripts/defects-report.mjs [--catalog ruta.json] [directorio-o-archivo ...]   (por defecto: reports)
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const args = process.argv.slice(2);
const catalogFlag = args.indexOf('--catalog');
const catalogPath =
  catalogFlag >= 0
    ? path.resolve(args.splice(catalogFlag, 2)[1] ?? '')
    : fileURLToPath(new URL('../pipeline/defectos.json', import.meta.url));
const roots = args.length ? args : ['reports'];

const loadCatalog = () => {
  const { defects } = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const valid =
    Array.isArray(defects) &&
    defects.length > 0 &&
    defects.every((d) => d.id && d.title && Array.isArray(d.cases) && Array.isArray(d.postman));
  if (!valid) throw new Error('el catálogo debe tener "defects" con id, title, cases y postman');
  return defects;
};

let defects;
try {
  defects = loadCatalog();
} catch (error) {
  console.error(`No se pudo leer el catálogo de defectos (${catalogPath}): ${error.message}`);
  process.exit(1);
}

const findXml = (target) => {
  if (!existsSync(target)) return [];
  if (statSync(target).isFile()) return target.endsWith('.xml') ? [target] : [];
  return readdirSync(target).flatMap((entry) => findXml(path.join(target, entry)));
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const list = (value) => (value === undefined ? [] : [].concat(value));
const escapeCell = (text) => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

// Newman concatena carpeta y petición sin espacios ni signos en el classname.
const normalize = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

const results = [];
for (const file of [...new Set(roots.flatMap(findXml))].sort()) {
  let doc;
  try {
    doc = parser.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  const suites = doc.testsuites ? list(doc.testsuites.testsuite) : list(doc.testsuite);
  for (const suite of suites) {
    for (const testcase of list(suite.testcase)) {
      const problem = list(testcase.failure)[0] ?? list(testcase.error)[0];
      const message =
        problem === undefined
          ? ''
          : String(typeof problem === 'object' ? (problem.message ?? problem['#text'] ?? '') : problem);
      results.push({
        report: path.basename(file),
        name: String(testcase.name ?? ''),
        classname: String(testcase.classname ?? ''),
        failed: problem !== undefined,
        skipped: testcase.skipped !== undefined,
        message: message.split('\n')[0].slice(0, 140),
      });
    }
  }
}

const matches = (defect, result) =>
  defect.cases.some((id) => new RegExp(`\\b${id}\\b`).test(result.name)) ||
  defect.postman.some((request) => normalize(result.classname).endsWith(normalize(request)));

const STATUS = { confirmed: 'Confirmado', fixed: 'Posible corrección', noData: 'Sin datos' };

const evaluated = defects.map((defect) => {
  const related = results.filter((result) => matches(defect, result));
  const executed = related.filter((result) => !result.skipped);
  const failures = executed.filter((result) => result.failed);
  const status = failures.length ? 'confirmed' : executed.length ? 'fixed' : 'noData';
  return { defect, executed, failures, status };
});

const lines = ['## Defectos abiertos', ''];
lines.push('| ID | Defecto | Severidad | Casos | Estado | Evidencia |');
lines.push('| --- | --- | --- | --- | --- | --- |');
for (const { defect, executed, failures, status } of evaluated) {
  const evidence = failures.length
    ? `${failures.length} de ${executed.length} pruebas fallan. Ej.: ${failures[0].message || failures[0].name}`
    : executed.length
      ? `${executed.length} pruebas pasaron`
      : 'No hay resultados de sus pruebas';
  lines.push(
    `| ${defect.id} | ${escapeCell(defect.title)} | ${defect.severity ?? ''} | ${defect.cases.join(', ')} | **${STATUS[status]}** | ${escapeCell(evidence)} |`,
  );
}
lines.push(
  '',
  'El job de defectos conocidos no bloquea el pipeline: las pruebas validan el comportamiento esperado y fallan mientras el defecto exista. Detalle en `evidencias/defectos.md`.',
);
const fixed = evaluated.filter((item) => item.status === 'fixed');
if (fixed.length) {
  lines.push(
    '',
    `Posible corrección de ${fixed.map((item) => item.defect.id).join(', ')}: confirmar con una nueva ejecución, retirar la etiqueta \`@known-defect\` de sus pruebas y cerrar el defecto en \`evidencias/defectos.md\`.`,
  );
}
if (!results.length) lines.push('', `No se encontraron reportes JUnit en: ${roots.join(', ')}`);

const markdown = `${lines.join('\n')}\n`;
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
process.stdout.write(markdown);

// Sintaxis de comandos de workflow: https://docs.github.com/actions/reference/workflow-commands-for-github-actions
const escapeData = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');

if (process.env.GITHUB_ACTIONS === 'true') {
  for (const { defect, status } of evaluated) {
    const cases = defect.cases.join(', ');
    const [level, title, detail] = {
      confirmed: ['warning', `${defect.id} abierto`, `${defect.title}. Casos: ${cases}.`],
      fixed: [
        'notice',
        `${defect.id} posible corrección`,
        `Las pruebas de ${cases} pasaron; revisar y retirar @known-defect.`,
      ],
      noData: [
        'warning',
        `${defect.id} sin datos`,
        `No hay resultados de ${cases}; no se pudo verificar el defecto.`,
      ],
    }[status];
    process.stdout.write(
      `::${level} title=${escapeProperty(title)},file=evidencias/defectos.md::${escapeData(detail)}\n`,
    );
  }
}
