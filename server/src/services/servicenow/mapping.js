/**
 * ServiceNow choice-list value <-> human label mappings.
 *
 * These reflect common out-of-box values for rm_story on a stock
 * Requirements Management install. ServiceNow orgs frequently customize
 * choice lists — verify against the target instance
 * (System Definition > Choice Lists, filtered to rm_story/sn_test_management_test)
 * and adjust the tables below if labels don't match.
 */

const STORY_STATE_LABELS = {
  '-5': 'Pending',
  '1': 'Draft',
  '2': 'Ready',
  '3': 'Work in Progress',
  '4': 'Complete',
  '7': 'Closed',
};

const STORY_PRIORITY_LABELS = {
  '1': 'Critical',
  '2': 'High',
  '3': 'Moderate',
  '4': 'Low',
  '5': 'Planning',
};

export function mapStateLabel(code) {
  if (code === undefined || code === null || code === '') return 'Unknown';
  return STORY_STATE_LABELS[String(code)] ?? `Unknown (${code})`;
}

export function mapPriorityLabel(code) {
  if (code === undefined || code === null || code === '') return 'Unknown';
  return STORY_PRIORITY_LABELS[String(code)] ?? `Unknown (${code})`;
}

// Our generator's priority ("High"|"Medium"|"Low") -> ServiceNow numeric priority code.
// Used when exporting test cases (Phase 2).
const PRIORITY_TO_SERVICENOW = {
  High: '2',
  Medium: '3',
  Low: '4',
};

export function mapPriorityToServiceNow(priority) {
  return PRIORITY_TO_SERVICENOW[priority] ?? '3';
}

// Our generator's category -> sn_test_management_test.test_type choice value.
// Best guess pending verification against the target instance's actual choice
// list (see docs/ServiceNow_Integration.md known-issue notes on this field).
const CATEGORY_TO_TEST_TYPE = {
  positive: 'Positive',
  negative: 'Negative',
  edge: 'Edge Cases',
  e2e: 'End to End',
};

export function mapCategoryToTestType(category) {
  return CATEGORY_TO_TEST_TYPE[category] ?? 'manual';
}
