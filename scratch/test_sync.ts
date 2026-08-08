import { syncTaskOutbound } from '../lib/services/apec-outbound-sync';
import { APEC_GLOBAL_BASE_URL } from '../lib/services/apec-global-api';

async function run() {
  const secretKey = '7LBsS1bIq+0jHWLDRmDktDY36LD0ea7mH2TnHFYzVwc=';
  console.log('--- TESTING syncTaskOutbound with progress=60, status=2 ---');
  const res = await syncTaskOutbound('UPDATE', {
    id: 349,
    name: 'TEST PROJECT MANAGER 2',
    progress: 60,
    status: 2
  }, 'TESTER', secretKey);
  console.log('syncTaskOutbound result:', res);

  const check = await fetch(`${APEC_GLOBAL_BASE_URL}/api/v1/external/tasks?id=349`, {
    headers: { 'X-Secret-Key': secretKey }
  }).then(r => r.json());
  console.log('After sync -> Task Process:', check.data.process, 'EA Process:', check.data.employee_assignments[0].process);
}

run();
