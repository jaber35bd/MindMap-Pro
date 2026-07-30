/* =========================================================================
   templates.js — Built-in starter templates shown on the dashboard so a
   signed-in user can create a nicely pre-designed mind map in one click,
   instead of starting from a blank "Central Idea" node. Grouped by category
   with a real rendered-SVG thumbnail per card (built from the actual
   template data, not a static image), so what you see is what you get —
   and every template stays fully editable/customizable once opened.
   ========================================================================= */

const MM_TEMPLATES = [
  {
    key: 'project-plan',
    title: 'Project Plan',
    icon: '📊',
    accent: '#5B5FEF',
    category: 'Work',
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
    key: 'meeting-notes',
    title: 'Meeting Notes',
    icon: '📝',
    accent: '#EC4899',
    category: 'Work',
    tagline: 'Agenda, discussion, decisions — ek jaygay',
    branches: [
      { text: 'Attendees', color: '#0EA5E9', kids: ['Name — role'] },
      { text: 'Agenda', color: '#5B5FEF', kids: ['Topic 1', 'Topic 2', 'Topic 3'] },
      { text: 'Discussion', color: '#F59E0B', kids: ['Key point 1', 'Key point 2'] },
      { text: 'Decisions', color: '#22C55E', kids: ['Decision 1'] },
      { text: 'Action Items', color: '#EF4444', kids: ['Owner — task — deadline'] },
    ],
  },
  {
    key: 'swot-analysis',
    title: 'SWOT Analysis',
    icon: '🎯',
    accent: '#22C55E',
    category: 'Work',
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
    category: 'Planning',
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
    key: 'daily-routine',
    title: 'Daily Routine',
    icon: '☀️',
    accent: '#0EA5E9',
    category: 'Planning',
    tagline: 'Shokal theke rat — ekta dine ki ki kora lagbe',
    branches: [
      { text: 'Morning', color: '#F59E0B', kids: ['Wake up / exercise', 'Breakfast', 'Plan the day'] },
      { text: 'Work block', color: '#5B5FEF', kids: ['Top priority task', 'Meetings/calls'] },
      { text: 'Evening', color: '#22C55E', kids: ['Dinner / family time', 'Personal project'] },
      { text: 'Night', color: '#8B5CF6', kids: ['Wind down', 'Sleep by ...'] },
    ],
  },
  {
    key: 'goal-tracker',
    title: 'Goal Tracker',
    icon: '🚀',
    accent: '#8B5CF6',
    category: 'Planning',
    tagline: 'Ekta goal, milestone, r obstacle map',
    branches: [
      { text: 'Milestones', color: '#5B5FEF', kids: ['Milestone 1', 'Milestone 2', 'Milestone 3'] },
      { text: 'Resources needed', color: '#0EA5E9', kids: ['Time', 'Budget', 'People/tools'] },
      { text: 'Obstacles', color: '#EF4444', kids: ['Risk 1', 'Risk 2'] },
      { text: 'Success metric', color: '#22C55E', kids: ['How will I measure it'] },
    ],
  },
  {
    key: 'study-notes',
    title: 'Study Notes',
    icon: '📚',
    accent: '#5B5FEF',
    category: 'Study',
    tagline: 'Ekta topic/chapter-er structured note',
    branches: [
      { text: 'Overview', color: '#5B5FEF', kids: ['What is this topic about'] },
      { text: 'Key concepts', color: '#0EA5E9', kids: ['Concept 1', 'Concept 2', 'Concept 3'] },
      { text: 'Definitions', color: '#22C55E', kids: ['Term — meaning'] },
      { text: 'Examples', color: '#F59E0B', kids: ['Worked example 1'] },
      { text: 'Revision', color: '#EF4444', kids: ['Common mistakes', 'Quick recap points'] },
    ],
  },
  {
    key: 'book-summary',
    title: 'Book Summary',
    icon: '📖',
    accent: '#EF4444',
    category: 'Study',
    tagline: 'Ekta boi porar por summary rakhar template',
    branches: [
      { text: 'Main themes', color: '#5B5FEF', kids: ['Theme 1', 'Theme 2'] },
      { text: 'Key events', color: '#0EA5E9', kids: ['Beginning', 'Turning point', 'Ending'] },
      { text: 'Favourite quotes', color: '#F59E0B', kids: ['Quote — page'] },
      { text: 'Lessons learned', color: '#22C55E', kids: ['Takeaway 1', 'Takeaway 2'] },
      { text: 'My rating', color: '#EC4899', kids: ['Score / review'] },
    ],
  },
  {
    key: 'process-flow',
    title: 'Process Flow / SOP',
    icon: '⚙️',
    accent: '#0EA5E9',
    category: 'Engineering',
    tagline: 'Ekta production/SOP process step-by-step map',
    branches: [
      { text: '1. Input / Material', color: '#5B5FEF', kids: ['Raw material check', 'Supplier spec'] },
      { text: '2. Process / Operation', color: '#0EA5E9', kids: ['Setup', 'Machine parameter', 'Operator step'] },
      { text: '3. Inspection / QC', color: '#F59E0B', kids: ['Dimension check', 'Defect criteria'] },
      { text: '4. Output', color: '#22C55E', kids: ['Packing', 'Storage'] },
      { text: '5. Feedback / CAPA', color: '#EF4444', kids: ['Root cause', 'Corrective action'] },
    ],
  },
  {
    key: 'root-cause-5why',
    title: 'Root Cause (5 Why)',
    icon: '🔍',
    accent: '#EF4444',
    category: 'Engineering',
    tagline: 'Problem theke root cause khonja — 5 Why style',
    branches: [
      { text: 'Problem statement', color: '#171A21', kids: ['What went wrong, where, when'] },
      { text: 'Why 1', color: '#F59E0B', kids: ['Possible cause'] },
      { text: 'Why 2', color: '#F59E0B', kids: ['Possible cause'] },
      { text: 'Why 3', color: '#F59E0B', kids: ['Possible cause'] },
      { text: 'Root cause & fix', color: '#22C55E', kids: ['Corrective action', 'Preventive action'] },
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

// Real rendered-SVG preview for a template card — built from the actual
// template structure (mmRenderThumbnailSvg), so the dashboard card shows
// exactly the shape/colors the diagram will open with.
function mmTemplateThumbnailSvg(key, w, h) {
  const tpl = MM_TEMPLATES.find(t => t.key === key);
  const model = mmCreateTemplateMap(key, tpl ? tpl.title : 'Template');
  return mmRenderThumbnailSvg(model, w || 220, h || 96);
}
