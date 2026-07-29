/* =========================================================================
   templates.js — Built-in starter templates shown on the dashboard so a
   signed-in user can create a nicely pre-designed mind map in one click,
   instead of starting from a blank "Central Idea" node.
   ========================================================================= */

const MM_TEMPLATES = [
  {
    key: 'project-plan',
    title: 'Project Plan',
    icon: '📊',
    accent: '#5B5FEF',
    tagline: 'Initiation theke Closure — full project roadmap',
    branches: [
      { text: '1. Initiation', color: '#5B5FEF', kids: ['Define objective', 'Identify stakeholders', 'Feasibility check'] },
      { text: '2. Planning', color: '#0EA5E9', kids: ['Scope & timeline', 'Resource allocation', 'Risk assessment'] },
      { text: '3. Execution', color: '#22C55E', kids: ['Task assignment', 'Progress tracking', 'Team coordination'] },
      { text: '4. Monitoring', color: '#F59E0B', kids: ['KPI review', 'Budget check', 'Quality control'] },
      { text: '5. Closure', color: '#EF4444', kids: ['Final review', 'Documentation', 'Lessons learned'] },
    ],
  },
  {
    key: 'swot-analysis',
    title: 'SWOT Analysis',
    icon: '🎯',
    accent: '#22C55E',
    tagline: 'Strengths, Weaknesses, Opportunities, Threats',
    branches: [
      { text: 'Strengths', color: '#22C55E', kids: ['Core advantage 1', 'Core advantage 2', 'Unique resource'] },
      { text: 'Weaknesses', color: '#EF4444', kids: ['Gap 1', 'Gap 2', 'Resource constraint'] },
      { text: 'Opportunities', color: '#0EA5E9', kids: ['Market trend', 'Partnership', 'New segment'] },
      { text: 'Threats', color: '#F59E0B', kids: ['Competitor move', 'Regulatory risk', 'Cost pressure'] },
    ],
  },
  {
    key: 'weekly-planner',
    title: 'Weekly Planner',
    icon: '🗓️',
    accent: '#F59E0B',
    tagline: 'Shonibar theke Shukrobar — weekly task map',
    branches: [
      { text: 'Saturday', color: '#5B5FEF', kids: ['Priority task', 'Meeting/class'] },
      { text: 'Sunday', color: '#0EA5E9', kids: ['Priority task', 'Meeting/class'] },
      { text: 'Monday', color: '#22C55E', kids: ['Priority task', 'Meeting/class'] },
      { text: 'Tuesday', color: '#F59E0B', kids: ['Priority task', 'Meeting/class'] },
      { text: 'Wednesday', color: '#EC4899', kids: ['Priority task', 'Meeting/class'] },
      { text: 'Thursday', color: '#EF4444', kids: ['Priority task', 'Meeting/class'] },
      { text: 'Friday', color: '#8B5CF6', kids: ['Rest / personal time'] },
    ],
  },
  {
    key: 'meeting-notes',
    title: 'Meeting Notes',
    icon: '📝',
    accent: '#EC4899',
    tagline: 'Agenda, discussion, decisions — ek jaygay',
    branches: [
      { text: 'Attendees', color: '#0EA5E9', kids: [] },
      { text: 'Agenda', color: '#5B5FEF', kids: ['Topic 1', 'Topic 2', 'Topic 3'] },
      { text: 'Discussion', color: '#F59E0B', kids: ['Key point 1', 'Key point 2'] },
      { text: 'Decisions', color: '#22C55E', kids: ['Decision 1'] },
      { text: 'Action Items', color: '#EF4444', kids: ['Owner — task — deadline'] },
    ],
  },
  {
    key: 'process-flow',
    title: 'Process Flow / SOP',
    icon: '⚙️',
    accent: '#0EA5E9',
    tagline: 'Ekta production/SOP process step-by-step map',
    branches: [
      { text: '1. Input / Material', color: '#5B5FEF', kids: ['Raw material check', 'Supplier spec'] },
      { text: '2. Process / Operation', color: '#0EA5E9', kids: ['Setup', 'Machine parameter', 'Operator step'] },
      { text: '3. Inspection / QC', color: '#F59E0B', kids: ['Dimension check', 'Defect criteria'] },
      { text: '4. Output', color: '#22C55E', kids: ['Packing', 'Storage'] },
      { text: '5. Feedback / CAPA', color: '#EF4444', kids: ['Root cause', 'Corrective action'] },
    ],
  },
];

// Builds a full model (root + branches + sub-nodes) for a given template key.
// Falls back to the plain default map if the key isn't recognised.
function mmCreateTemplateMap(key, title) {
  const tpl = MM_TEMPLATES.find(t => t.key === key);
  if (!tpl) return mmCreateDefaultMap(title);

  const model = mmCreateDefaultMap(title || tpl.title);
  // Remove the generic "Main Idea 1/2" sample children that mmCreateDefaultMap adds.
  [...model.nodes.get(model.rootId).children].forEach(cid => mmDeleteSubtree(model, cid));
  model.layout = 'tree-balanced';

  const rootNode = model.nodes.get(model.rootId);
  Object.assign(rootNode, { fillColor: tpl.accent, borderColor: tpl.accent, icon: tpl.icon });

  tpl.branches.forEach(b => {
    const bid = mmAddChild(model, model.rootId, b.text);
    const bnode = model.nodes.get(bid);
    Object.assign(bnode, { fillColor: b.color, borderColor: b.color, textColor: '#FFFFFF', bold: true, shape: 'rounded' });
    (b.kids || []).forEach(k => mmAddChild(model, bid, k));
  });

  return model;
}
