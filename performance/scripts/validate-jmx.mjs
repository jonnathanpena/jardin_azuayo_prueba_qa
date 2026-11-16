// Validación estática del plan JMeter: no ejecuta carga, solo verifica que el .jmx esté bien formado
// y contenga los elementos que exige el plan (ver performance/README.md).
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const here = path.dirname(fileURLToPath(import.meta.url));
const jmxPath = path.resolve(here, '..', 'parabank-transacciones.jmx');
const csvPath = path.resolve(here, '..', 'data', 'accounts.csv');

const xml = readFileSync(jmxPath, 'utf8');
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const syntax = XMLValidator.validate(xml);
if (syntax !== true) {
  console.error(`XML inválido: ${syntax.err.msg} (línea ${syntax.err.line})`);
  process.exit(1);
}

const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' }).parse(xml);

// Recolecta todos los elementos con testclass (los componentes de JMeter) en cualquier nivel.
const components = [];
(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item && typeof item === 'object' && item['@testclass']) {
          components.push({
            tag: key,
            name: item['@testname'],
            enabled: item['@enabled'] !== 'false',
            node: item,
          });
        }
      }
      walk(value);
    }
  }
})(doc);

const byClass = (cls) => components.filter((c) => c.node['@testclass'] === cls && c.enabled);
const props = (node) => [].concat(node.stringProp ?? []).map((p) => [p['@name'], String(p['#text'] ?? '')]);
const prop = (node, name) => props(node).find(([n]) => n === name)?.[1];

const plan = byClass('TestPlan')[0];
check(plan, 'Falta el TestPlan');
check(
  plan &&
    []
      .concat(plan.node.boolProp)
      .some((p) => p['@name'] === 'TestPlan.serialize_threadgroups' && String(p['#text']) === 'true'),
  'Los grupos de hilos deben ejecutarse en serie (serialize_threadgroups=true)',
);

const STEPS = 5;
const expectedGroups = ['Escenario base', ...Array.from({ length: STEPS }, (_, i) => `Escalón ${i + 1}`)];
const threadGroups = byClass('ThreadGroup');
check(
  threadGroups.length === expectedGroups.length,
  `Se esperaban ${expectedGroups.length} Thread Groups (base y ${STEPS} escalones) y hay ${threadGroups.length}`,
);
for (const name of expectedGroups) {
  check(
    threadGroups.some((tg) => tg.name === name),
    `Falta el Thread Group "${name}"`,
  );
}
for (const tg of threadGroups) {
  const loops = []
    .concat(tg.node.elementProp ?? [])
    .flatMap((e) => props(e))
    .find(([n]) => n === 'LoopController.loops')?.[1];
  check(
    /__P\(/.test(prop(tg.node, 'ThreadGroup.num_threads') ?? ''),
    `"${tg.name}": usuarios no parametrizados con __P`,
  );
  check(
    /__P\(/.test(prop(tg.node, 'ThreadGroup.ramp_time') ?? ''),
    `"${tg.name}": rampa no parametrizada con __P`,
  );
  check(/__P\(/.test(loops ?? ''), `"${tg.name}": iteraciones no parametrizadas con __P`);
}

// Cada Thread Group debe contener su propio sampler y su timer (se inspecciona el XML crudo por grupo).
xml
  .split('<ThreadGroup ')
  .slice(1)
  .forEach((chunk) => {
    const name = /testname="([^"]*)"/.exec(chunk)?.[1] ?? '?';
    const body = chunk.split('<ResponseAssertion')[0];
    check(body.includes('testclass="HTTPSamplerProxy"'), `"${name}": falta el HTTP Request`);
    check(
      body.includes('testclass="UniformRandomTimer"'),
      `"${name}": falta el tiempo de espera (think time)`,
    );
  });

const samplers = byClass('HTTPSamplerProxy');
check(samplers.length === expectedGroups.length, 'Cada escenario y escalón debe tener un HTTP Request');
check(
  new Set(samplers.map((s) => s.name)).size === samplers.length,
  'Las etiquetas de los HTTP Request deben ser distintas para reportar cada escalón por separado',
);
for (const s of samplers) {
  check(prop(s.node, 'HTTPSampler.method') === 'GET', `"${s.name}": el método debe ser GET`);
  check(
    /\/accounts\/\$\{accountId\}\/transactions$/.test(prop(s.node, 'HTTPSampler.path') ?? ''),
    `"${s.name}": la ruta debe ser .../accounts/\${accountId}/transactions`,
  );
}

check(byClass('ConfigTestElement').length === 1, 'Falta HTTP Request Defaults');
check(byClass('HeaderManager').length === 1, 'Falta el Header Manager (Accept: application/json)');
check(
  xml.includes('<stringProp name="Header.value">application/json</stringProp>'),
  'Falta la cabecera Accept: application/json',
);
check(byClass('CSVDataSet').length === 1, 'Falta el CSV Data Set de cuentas');
check(
  byClass('UniformRandomTimer').length >= expectedGroups.length,
  'Cada escenario debe tener tiempo de espera (think time)',
);
check(byClass('ResponseAssertion').length >= 1, 'Falta la aserción de código HTTP');
check(byClass('JSONPathAssertion').length >= 1, 'Falta la aserción de JSON');
check(byClass('DurationAssertion').length >= 1, 'Falta la aserción de SLA (Duration Assertion)');
check(byClass('ResultCollector').length >= 2, 'Faltan listeners (Summary / Aggregate)');

for (const forbidden of ['parasoft.com/parabank/services/bank/accounts/12345']) {
  check(!xml.includes(forbidden), `URL fija encontrada: ${forbidden}`);
}

check(existsSync(csvPath), `No existe ${path.relative(process.cwd(), csvPath)}`);
if (existsSync(csvPath)) {
  const [header, ...rows] = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  check(header === 'accountId', 'El CSV debe tener la cabecera "accountId"');
  check(rows.length > 0 && rows.every((r) => /^\d+$/.test(r)), 'El CSV debe contener solo ids numéricos');
}

if (failures.length) {
  console.error(`ERROR ${path.basename(jmxPath)}: ${failures.length} problema(s)`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
process.stdout.write(
  `OK ${path.basename(jmxPath)}: ${components.length} componentes, ${threadGroups.length} escenarios, plan válido\n`,
);
