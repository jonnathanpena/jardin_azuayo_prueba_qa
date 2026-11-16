// Resume los reportes JUnit (Playwright y Newman) en una tabla Markdown.
// En GitHub Actions la escribe en el resumen del job (GITHUB_STEP_SUMMARY); en local la imprime por consola.
// Uso: node scripts/junit-summary.mjs [directorio-o-archivo ...]   (por defecto: reports)
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const inputs = process.argv.slice(2);
const roots = inputs.length ? inputs : ['reports'];

const findXml = (target) => {
  if (!existsSync(target)) return [];
  if (statSync(target).isFile()) return target.endsWith('.xml') ? [target] : [];
  return readdirSync(target).flatMap((entry) => findXml(path.join(target, entry)));
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const list = (value) => (value === undefined ? [] : [].concat(value));
const num = (value) => Number(value ?? 0) || 0;

const rows = [];
const failures = [];

for (const file of [...new Set(roots.flatMap(findXml))].sort()) {
  let doc;
  try {
    doc = parser.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  const suites = doc.testsuites ? list(doc.testsuites.testsuite) : list(doc.testsuite);
  if (!suites.length) continue;

  const total = { tests: 0, failures: 0, errors: 0, skipped: 0, time: 0 };
  for (const suite of suites) {
    total.tests += num(suite.tests);
    total.failures += num(suite.failures);
    total.errors += num(suite.errors);
    total.skipped += num(suite.skipped);
    total.time += num(suite.time);
    for (const testcase of list(suite.testcase)) {
      const problem = list(testcase.failure)[0] ?? list(testcase.error)[0];
      if (problem !== undefined) {
        const message =
          typeof problem === 'object' ? (problem.message ?? problem['#text'] ?? '') : String(problem);
        failures.push({
          report: path.basename(file),
          name: `${testcase.classname ? `${testcase.classname} › ` : ''}${testcase.name}`,
          message: String(message).split('\n')[0].slice(0, 160),
        });
      }
    }
  }
  const failed = total.failures + total.errors;
  rows.push({
    report: path.relative(process.cwd(), file),
    ...total,
    passed: total.tests - failed - total.skipped,
    failed,
  });
}

const escape = (text) => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const lines = ['## Resultados de pruebas', ''];

if (!rows.length) {
  lines.push(`No se encontraron reportes JUnit en: ${roots.join(', ')}`);
} else {
  lines.push('| Reporte | Total | Pasaron | Fallaron | Omitidas | Tiempo (s) |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const r of rows) {
    lines.push(
      `| \`${escape(r.report)}\` | ${r.tests} | ${r.passed} | ${r.failed} | ${r.skipped} | ${r.time.toFixed(1)} |`,
    );
  }
  if (failures.length) {
    lines.push('', '### Pruebas fallidas', '', '| Reporte | Prueba | Mensaje |', '| --- | --- | --- |');
    for (const f of failures.slice(0, 50)) {
      lines.push(`| ${escape(f.report)} | ${escape(f.name)} | ${escape(f.message)} |`);
    }
    if (failures.length > 50) lines.push('', `… y ${failures.length - 50} más (ver artefactos).`);
  }
}

const markdown = `${lines.join('\n')}\n`;
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
process.stdout.write(markdown);
