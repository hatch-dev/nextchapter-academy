var API_BASE = '/nextchapter/api';
var SK = 'pipeline-v3';

function emptyData() {
    return {
        ideas: [],
        selected: [],
        assessments: {},
        projects: {},
        completedSteps: {},
        completedSections: {},
        ownership: {},
        incentives: {},
        rhythm: {},
        portfolio: {},
        capAlloc: {},
        capital: {},
        experiments: {},
        expSelected: [],
        tracking: {},
        review: {},
        governance: {},
        stress: {},
        launched: [],
        opsData: {},
        notes: [],
        raci: {},
        purpose: {},
        knowledge: {},
        culture: {},
        decisions: {},
        audit: []
    }
}
var data = emptyData();
var currentPage = 'home',
    currentStep = null,
    currentPhase = null;
var sidebarOpen = true;
var coachOpen = false,
    notesOpen = false;
// Pipeline module UI state
var UI = {
    v: 'home',
    prev: null,
    sb: true,
    sec: '1.1',
    ap: null,
    showEx: {},
    sf: false,
    ec: null,
    ctxOpen: {},
    addForm: false,
    expanded: {},
    ni: {
        name: '',
        desc: '',
        strategic: '',
        cost: '',
        timeframe: '',
        dept: '',
        when: 'now'
    }
};
var coachMsgs = [{
    role: 'ai',
    text: 'Welcome to the AI Innovation Pipeline. I\'m your strategic guide through the 90-day transformation journey. Ask me about any step, framework, or concept — or challenge me on where you\'re stuck.'
}];
var coachCtx = 'Overview';
var appReady = false,
    currentUser = null,
    currentAccount = null,
    workspaceUsers = [],
    modules = [],
    products = [],
    productsLoaded = false,
    moduleMenuOpen = false,
    saveTimer = null,
    sharedData = {},
    sharedSaveTimer = null,
    authMode = 'login',
    authError = '',
    authNotice = '',
    billingError = '',
    billingNotice = '';
var authForm = {
    email: '',
    password: '',
    name: '',
    company_name: '',
    contact_role: '',
    contact_phone: ''
};
var billingForm = {
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_role: '',
    billing_notes: '',
    price_id: ''
};
var userForm = {
    name: '',
    email: '',
    password: '',
    role: 'Standard User',
    scope: 'Assigned work'
};

function $(id) {
    return document.getElementById(id)
}

function uid() {
    return Math.random().toString(36).slice(2, 10)
}

function fmt(d) {
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML
}

function normalizePipelineData(value) {
    var base = emptyData();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
    return Object.assign(base, value)
}

function localBackupKey() {
    return currentUser ? 'pipeline-backup-' + currentUser.account_id : 'pipeline-backup'
}

function apiReq(method, path, body) {
    var opts = {
        method: method,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(API_BASE + path, opts).then(function(r) {
        return r.json().catch(function() {
            return {
                ok: false,
                error: 'Invalid server response'
            }
        }).then(function(j) {
            if (!r.ok || j.ok === false) throw new Error(j.error || 'Request failed');
            return j.data !== undefined ? j.data : j
        })
    })
}

function apiGet(path) {
    return apiReq('GET', path)
}

function apiPost(path, body) {
    return apiReq('POST', path, body)
}

function apiPut(path, body) {
    return apiReq('PUT', path, body)
}

function apiDel(path, body) {
    return apiReq('DELETE', path, body)
}

function hasActiveSubscription() {
    return ((currentAccount && currentAccount.subscription_status) || '').toLowerCase() === 'active'
}

function setPath(obj, path, val) {
    var parts = path.split('.'),
        cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = val
}

function getPath(obj, path) {
    return path.split('.').reduce(function(o, k) {
        return o && o[k]
    }, obj)
}

function hasValue(v) {
    return v !== undefined && v !== null && String(v).trim() !== ''
}

function applySharedAnswers() {
    sharedData = sharedData || {};
    [{
        key: 'innovation.pipelineOwner',
        path: 'ownership.ownerName'
    }, {
        key: 'innovation.ownerRole',
        path: 'ownership.ownerRole'
    }, {
        key: 'innovation.ownerAuthority',
        path: 'ownership.authority'
    }, {
        key: 'innovation.rhythmDay',
        path: 'rhythm.day'
    }, {
        key: 'innovation.rhythmTime',
        path: 'rhythm.time'
    }, {
        key: 'innovation.rhythmAttendees',
        path: 'rhythm.attendees'
    }, {
        key: 'innovation.reviewAttendees',
        path: 'governance.reviewAttendees'
    }, {
        key: 'innovation.gateThreshold',
        path: 'governance.threshold'
    }, {
        key: 'innovation.gateProcess',
        path: 'governance.gateProcess'
    }].forEach(function(m) {
        var cur = getPath(data, m.path),
            shared = getPath(sharedData, m.key);
        if (!hasValue(cur) && hasValue(shared)) setPath(data, m.path, shared)
    })
}

function exportSharedAnswers() {
    sharedData = sharedData || {};
    [{
        key: 'innovation.pipelineOwner',
        val: (data.ownership || {}).ownerName
    }, {
        key: 'innovation.ownerRole',
        val: (data.ownership || {}).ownerRole
    }, {
        key: 'innovation.ownerAuthority',
        val: (data.ownership || {}).authority
    }, {
        key: 'innovation.rhythmDay',
        val: (data.rhythm || {}).day
    }, {
        key: 'innovation.rhythmTime',
        val: (data.rhythm || {}).time
    }, {
        key: 'innovation.rhythmAttendees',
        val: (data.rhythm || {}).attendees
    }, {
        key: 'innovation.reviewAttendees',
        val: (data.governance || {}).reviewAttendees
    }, {
        key: 'innovation.gateThreshold',
        val: (data.governance || {}).threshold
    }, {
        key: 'innovation.gateProcess',
        val: (data.governance || {}).gateProcess
    }].forEach(function(m) {
        if (hasValue(m.val)) setPath(sharedData, m.key, m.val)
    })
}

function saveSharedData() {
    if (!currentUser || !hasActiveSubscription()) return;
    exportSharedAnswers();
    clearTimeout(sharedSaveTimer);
    var payload = JSON.parse(JSON.stringify(sharedData || {}));
    sharedSaveTimer = setTimeout(function() {
        apiPut('/shared-data', payload).catch(function(e) {
            console.warn('Shared save failed', e.message)
        })
    }, 600)
}

function loadSharedData() {
    return apiGet('/shared-data').then(function(d) {
        sharedData = (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}
    }).catch(function() {
        sharedData = {}
    })
}

function formatMoney(amount, currency) {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD'
        }).format((amount || 0) / 100)
    } catch (e) {
        return '$' + ((amount || 0) / 100).toFixed(2)
    }
}

function setChrome(show) {
    ['voiceFab', 'notesFab', 'coachFab', 'fabPulse', 'gchatFab'].forEach(function(id) {
        var el = $(id);
        if (el) el.style.display = show ? 'flex' : 'none'
    });
    var st = $('sidebarToggle');
    if (st) st.style.display = show ? 'block' : 'none';
    if (!show) {
        coachOpen = false;
        notesOpen = false;
        var cp = $('coachPanel'),
            np = $('notesPanel'),
            sb = $('pipSidebar'),
            app = $('app');
        if (cp) cp.className = 'coach-panel';
        if (np) np.className = 'notes-panel';
        if (sb) sb.style.display = 'none';
        if (app) app.classList.add('sidebar-collapsed')
    }
}

function loadData() {
    return apiGet('/pipeline').then(function(d) {
        data = normalizePipelineData(d);
        try {
            var backup = localStorage.getItem(localBackupKey());
            if (backup && JSON.stringify(data) === JSON.stringify(emptyData())) data = normalizePipelineData(JSON.parse(backup))
        } catch (e) {}
        applySharedAnswers()
    }).catch(function() {
        try {
            data = normalizePipelineData(JSON.parse(localStorage.getItem(localBackupKey()) || '{}'))
        } catch (e) {
            data = emptyData()
        }
        applySharedAnswers()
    })
}

function saveData() {
    if (!currentUser || !hasActiveSubscription()) return;
    clearTimeout(saveTimer);
    data = normalizePipelineData(data);
    try {
        localStorage.setItem(localBackupKey(), JSON.stringify(data))
    } catch (e) {}
    var payload = JSON.parse(JSON.stringify(data));
    saveSharedData();
    saveTimer = setTimeout(function() {
        apiPut('/pipeline', payload).catch(function(e) {
            console.warn('Save failed', e.message)
        })
    }, 500)
}

function flushSaveData() {
    if (!currentUser || !hasActiveSubscription()) return Promise.resolve();
    clearTimeout(saveTimer);
    data = normalizePipelineData(data);
    try {
        localStorage.setItem(localBackupKey(), JSON.stringify(data))
    } catch (e) {}
    var payload = JSON.parse(JSON.stringify(data));
    exportSharedAnswers();
    return Promise.all([apiPut('/pipeline', payload), apiPut('/shared-data', JSON.parse(JSON.stringify(sharedData || {}))).catch(function(e) {
        console.warn('Shared save failed', e.message)
    })]).catch(function(e) {
        console.warn('Save failed', e.message)
    })
}

var PH = [{
        id: 1,
        name: 'Diagnose',
        days: 'Days 1\u201330',
        color: '#1B6B5A',
        steps: [{
            id: '1.1',
            name: 'Assessment Battery',
            icon: '01'
        }, {
            id: '1.2',
            name: 'Brainstorm Use Cases',
            icon: '02'
        }, {
            id: '1.3',
            name: 'Filter & Rank',
            icon: '03'
        }],
        outcomes: [{
            id: 'out-report',
            name: 'Assessment Report',
            icon: 'Report'
        }, {
            id: 'out-bluesky',
            name: 'Blue Sky Portfolio',
            icon: 'Portfolio'
        }]
    },
    {
        id: 2,
        name: 'Organize',
        days: 'Days 31\u201350',
        color: '#2D5A8E',
        steps: [{
            id: '2.1',
            name: 'Ownership & Structure',
            icon: '01'
        }, {
            id: '2.2',
            name: 'Realign Incentives',
            icon: '02'
        }, {
            id: '2.3',
            name: 'Innovation Rhythm',
            icon: '03'
        }, {
            id: '2.4',
            name: 'Deepen Assessment',
            icon: '04'
        }],
        outcomes: [{
            id: 'out-orgready',
            name: 'Org Readiness',
            icon: 'Summary'
        }, {
            id: 'out-raci',
            name: 'RACI Matrix',
            icon: 'Matrix'
        }, {
            id: 'out-explore',
            name: 'Exploration Portfolio',
            icon: 'Portfolio'
        }]
    },
    {
        id: 3,
        name: 'Prepare',
        days: 'Days 51\u201370',
        color: '#8B5E3C',
        steps: [{
            id: '3.1',
            name: 'Structure Portfolio',
            icon: '01'
        }, {
            id: '3.2',
            name: 'Allocate Capital',
            icon: '02'
        }, {
            id: '3.3',
            name: 'Design Experiments',
            icon: '03'
        }],
        outcomes: [{
            id: 'out-devport',
            name: 'Development Portfolio',
            icon: 'Portfolio'
        }, {
            id: 'out-capplan',
            name: 'Capital Plan',
            icon: 'Plan'
        }, {
            id: 'out-expbriefs',
            name: 'Experiment Briefs',
            icon: 'Briefs'
        }]
    },
    {
        id: 4,
        name: 'Ignite',
        days: 'Days 71\u201390',
        color: '#9B2D3F',
        steps: [{
            id: '4.1',
            name: 'Launch Experiments',
            icon: '01'
        }, {
            id: '4.2',
            name: 'Establish Governance',
            icon: '02'
        }, {
            id: '4.3',
            name: 'Stress-Test Org Design',
            icon: '03'
        }, {
            id: '4.4',
            name: 'First Portfolio Review',
            icon: '04'
        }],
        outcomes: [{
            id: 'out-govfw',
            name: 'Governance Framework',
            icon: 'Framework'
        }, {
            id: 'out-orgrev',
            name: 'Org Design Review',
            icon: 'Review'
        }, {
            id: 'out-finalport',
            name: 'Updated Dev Portfolio',
            icon: 'Portfolio'
        }]
    },
    {
        id: 5,
        name: 'Navigate',
        days: 'Ongoing',
        color: '#6B4C8A',
        steps: [{
            id: '5.1',
            name: 'Pipeline Dashboard',
            icon: '01'
        }],
        outcomes: [{
            id: 'out-oper',
            name: 'Operational Portfolio',
            icon: 'Portfolio'
        }]
    }
];

var CTX = {
    '1.1': {
        i: '98% of companies are exploring AI, but only 4% report significant returns. The gap isn\'t technology \u2014 it\'s organizational readiness.',
        s: 'Companies that formally assess AI readiness before investing are 3.2x more likely to achieve positive ROI within 18 months.',
        a: '90 Days to an AI Innovation Pipeline',
        src: 'Fast Company'
    },
    '1.2': {
        i: 'The most dangerous question in AI strategy is \'What can AI do?\' The right question is \'What do we need?\'',
        s: 'Organizations that begin with purpose-driven AI use cases report 40% higher adoption rates.',
        a: 'The right (and wrong) way for leaders to think about AI',
        src: 'Fast Company'
    },
    '1.3': {
        i: 'Treating AI initiatives as individual projects is the single most common mistake. A portfolio approach transforms a high-stakes gamble into a managed investment strategy.',
        s: 'Only 26% of AI initiatives reach production. Portfolio management with stage gates increases that to over 60%.',
        a: 'Manage Your AI Investments Like a Portfolio',
        src: 'HBR'
    },
    '2.1': {
        i: 'Innovation without ownership is daydreaming. Every pipeline needs a named owner with explicit authority.',
        s: 'Organizations with a named innovation owner are 2.7x more likely to move AI projects from exploration to production.',
        a: 'Three myths that undermine AI success',
        src: 'Fast Company'
    },
    '2.2': {
        i: 'You get what you incentivize. The incentive structure must reward experimentation, learning speed, and pipeline health.',
        s: 'Culture transformation is harder than technology implementation \u2014 but it\'s the foundation everything else rests on.',
        a: 'Three myths that undermine AI success',
        src: 'Fast Company'
    },
    '2.3': {
        i: 'Innovation doesn\'t happen in the gaps between \'real work.\' It requires protected, recurring time with the right people.',
        s: 'Companies with a standing weekly innovation meeting move ideas through the pipeline 4x faster.',
        a: 'The age of AI requires a new kind of leadership',
        src: 'Fast Company'
    },
    '2.4': {
        i: 'The difference between a good idea and a viable project is rigorous assessment. SWOT, gap analysis, and partnership mapping separate enthusiasm from evidence.',
        s: 'Projects that undergo structured assessment before entering development have a 73% higher success rate.',
        a: 'The dual challenge of AI',
        src: 'I by IMD'
    },
    '3.1': {
        i: 'A healthy portfolio balances quick wins, medium-term projects, and long-term bets. Overweighting any category is a strategic vulnerability.',
        s: 'The most successful AI portfolios allocate roughly 50% to quick wins, 30% to medium-term, and 20% to long-term bets.',
        a: 'Transform your AI adoption strategy',
        src: 'I by IMD'
    },
    '3.2': {
        i: 'Capital allocation is where strategy becomes real. Stage-gate discipline means no project gets its next tranche without hitting milestones.',
        s: 'Stage-gated funding reduces AI project waste by 45% compared to upfront full-budget allocation.',
        a: 'Manage Your AI Investments Like a Portfolio',
        src: 'HBR'
    },
    '3.3': {
        i: 'Structure experiments as learning journeys, not validation exercises. The goal is to discover what works, what breaks, and what the organization learns.',
        s: 'Teams that frame experiments as \'learning\' generate 2.5x more actionable insights per cycle.',
        a: '90 Days to an AI Innovation Pipeline',
        src: 'Fast Company'
    },
    '4.1': {
        i: 'The gap between planning and doing is where most innovation programs die. Track what the organization learns about its own capacity for change.',
        s: '60% of AI pilots succeed technically but fail to scale. Infrastructure learnings enable scaling.',
        a: 'When it comes to AI, innovation isn\'t enough',
        src: 'Fast Company'
    },
    '4.2': {
        i: 'Governance isn\'t bureaucracy \u2014 it\'s the immune system that keeps your innovation portfolio healthy.',
        s: 'Innovation programs with formal quarterly reviews are 5x more likely to be sustained.',
        a: 'If you want to get AI right, look past the technology',
        src: 'Fast Company'
    },
    '4.3': {
        i: 'Even the best-designed organization will develop friction points. Decision bottlenecks, unclear ownership, and cultural resistance need identification.',
        s: 'Organizations that conduct a formal stress test within 90 days reduce structural failures by 38% in Year 1.',
        a: 'The dual challenge of AI',
        src: 'I by IMD'
    },
    '4.4': {
        i: 'The quarterly portfolio review is the engine. Buy, sell, or hold \u2014 every initiative gets a verdict, the pipeline gets replenished.',
        s: 'Companies that implement Buy/Sell/Hold reviews reallocate 25\u201330% of their AI budget per cycle.',
        a: 'Manage Your AI Investments Like a Portfolio',
        src: 'HBR'
    }
};

var MILESTONES = {
    '1.1': 'Baseline established \u2014 you now have a quantified picture of your organization\'s AI readiness.',
    '1.2': 'Ideas surfaced \u2014 your Blue Sky Portfolio captures every AI opportunity worth considering.',
    '1.3': 'Portfolio filtered \u2014 the FIRST assessment has ranked your ideas by feasibility, impact, readiness, strategic fit, and timeline.',
    '2.1': 'Ownership assigned \u2014 every project has a named owner with explicit authority.',
    '2.2': 'Incentives realigned \u2014 innovation metrics are tied to the behaviors that matter.',
    '2.3': 'Innovation rhythm set \u2014 standing meetings and portfolio reviews are calendared.',
    '2.4': 'Projects deepened \u2014 SWOT analysis, gap analysis, and partnerships mapped.',
    '3.1': 'Portfolio structured \u2014 projects organized by time horizon with strategic balance assessed.',
    '3.2': 'Capital allocated \u2014 resources assigned with stage-gate milestones.',
    '3.3': 'Experiments designed \u2014 quick wins selected with success criteria, owners, and timelines.',
    '4.1': 'Experiments launched \u2014 your first AI initiatives are live with tracking in place.',
    '4.2': 'Governance established \u2014 the framework that will sustain your portfolio beyond 90 days.',
    '4.3': 'Organization stress-tested \u2014 structural readiness confirmed for sustained innovation.',
    '4.4': 'First review complete \u2014 Buy/Sell/Hold decisions made. Your innovation portfolio is operational.'
};

function go(page, step) {
    moduleMenuOpen = false;
    // Bridge: handle single-arg calls from pipeline module (go('1.2'), go('out-report'), etc.)
    if (step === undefined && page !== 'home' && page !== 'learn' && page !== 'pipeline' && page !== 'insights' && page !== 'phase5') {
        var v = page;
        if (v.match(/^\d+\.\d/)) {
            page = 'step';
            step = v;
        } else if (v.indexOf('out-') === 0) {
            page = 'outcome';
            step = v;
        } else if (v.indexOf('phase-') === 0) {
            page = 'phase';
            step = v.split('-')[1];
        } else if (v === 'nav-bluesky' || v === 'nav-explore' || v === 'nav-develop' || v === 'launch-proj') {
            page = v;
            step = null;
        }
    }
    currentPage = page;
    currentPhase = null;
    if (page === 'phase' && step) {
        // Phase landing: find phase by ID (1-5), not step ID
        for (var i = 0; i < PH.length; i++) {
            if (String(PH[i].id) === String(step)) {
                currentPhase = PH[i];
                currentStep = String(step);
                break
            }
        }
    } else {
        if (step) currentStep = step;
        else currentStep = null;
        if (currentStep) {
            for (var i = 0; i < PH.length; i++) {
                for (var j = 0; j < PH[i].steps.length; j++) {
                    if (PH[i].steps[j].id === currentStep) {
                        currentPhase = PH[i];
                        break
                    }
                }
                if (currentPhase) break;
                if (PH[i].outcomes) {
                    for (var k = 0; k < PH[i].outcomes.length; k++) {
                        if (PH[i].outcomes[k].id === currentStep) {
                            currentPhase = PH[i];
                            break
                        }
                    }
                }
                if (currentPhase) break;
            }
        }
    }
    render();
    window.scrollTo(0, 0);
}

function getStages() {
    var ideas = data.ideas || [];
    var sel = data.selected || [];
    var projects = data.projects || {};
    var review = data.review || {};
    var launched = data.launched || [];
    var expSel = data.expSelected || [];
    var operational = [...new Set([...launched, ...expSel.filter(i => ((review.items || {})[i] || {}).decision === 'buy')])];
    var goProjects = sel.filter(i => (projects[i] || {}).viable === true);
    var noGoProjects = sel.filter(i => (projects[i] || {}).viable === false);
    var experiment = expSel.filter(i => !operational.includes(i));
    var explore = goProjects.filter(i => !expSel.includes(i) && !operational.includes(i));
    var pending = sel.filter(i => !goProjects.includes(i) && !noGoProjects.includes(i));
    var unselected = ideas.map(function(_, i) {
        return i
    }).filter(function(i) {
        return !sel.includes(i)
    });
    var bluesky = [...unselected, ...pending];
    return {
        bluesky,
        explore,
        experiment,
        operational,
        noGo: noGoProjects
    };
}

function getScore(idx) {
    var a = data.assessments[idx];
    if (!a) return 0;
    return (a.priority || 0) + (a.risk || 0) + (a.value || 0) + (a.costScore || 0) + (a.difficulty || 0);
}

function isStepDone(id) {
    var cs = data.completedSteps || {};
    if (id === '1.2') return (data.ideas || []).length >= 3;
    if (id === '1.3') return (data.selected || []).length > 0;
    return !!cs[id];
}

function syncBillingForm() {
    billingForm.company_name = (currentAccount && currentAccount.company_name) || '';
    billingForm.contact_name = (currentAccount && currentAccount.contact_name) || (currentUser && currentUser.name) || '';
    billingForm.contact_email = (currentAccount && currentAccount.contact_email) || (currentUser && currentUser.email) || '';
    billingForm.contact_phone = (currentAccount && currentAccount.contact_phone) || '';
    billingForm.contact_role = (currentAccount && currentAccount.role) || (currentUser && currentUser.role) || '';
    billingForm.billing_notes = (currentAccount && currentAccount.billing_notes) || '';
    billingForm.price_id = (currentAccount && currentAccount.stripe_price_id) || billingForm.price_id || ''
}

function hydrateUser(user) {
    currentUser = user || null;
    currentAccount = user && user.account ? user.account : null;
    modules = (currentAccount && currentAccount.modules) || [];
    workspaceUsers = [];
    syncBillingForm();
    if (typeof refreshTeamChatVisibility === 'function') refreshTeamChatVisibility();
    if (!currentUser) {
        data = emptyData();
        return Promise.resolve()
    }
    return apiGet('/users').then(function(u) {
        workspaceUsers = Array.isArray(u) ? u : []
    }).catch(function() {
        workspaceUsers = []
    }).then(function() {
        if (!hasActiveSubscription()) {
            data = emptyData();
            return
        }
        return apiGet('/modules').then(function(payload) {
            modules = payload.modules || modules;
            if (payload.account) {
                currentAccount = payload.account;
                syncBillingForm()
            }
        }).catch(function() {}).then(loadSharedData).then(loadData)
    })
}

function refreshAccount() {
    return apiGet('/account').then(function(account) {
        currentAccount = account;
        modules = account.modules || modules;
        syncBillingForm();
        return account
    })
}

function enterDashboard() {
    return apiGet('/users').then(function(u) {
        workspaceUsers = Array.isArray(u) ? u : workspaceUsers
    }).catch(function() {}).then(function() {
        return apiGet('/modules').then(function(payload) {
            modules = payload.modules || modules;
            if (payload.account) {
                currentAccount = payload.account;
                syncBillingForm()
            }
        }).catch(function() {})
    }).then(loadSharedData).then(loadData).then(function() {
        billingNotice = '';
        currentPage = 'modules'
    })
}

function pollCheckoutStatus(attempt) {
    attempt = attempt || 0;
    return refreshAccount().then(function() {
        if (hasActiveSubscription()) return enterDashboard();
        if (attempt >= 12) return;
        return new Promise(function(resolve) {
            setTimeout(resolve, 2500)
        }).then(function() {
            return pollCheckoutStatus(attempt + 1)
        })
    })
}

function initApp() {
    appReady = false;
    render();
    apiGet('/session').then(function(user) {
        if (user && user.id) return hydrateUser(user)
    }).catch(function() {}).then(function() {
        var qs = new URLSearchParams(window.location.search);
        var checkoutState = qs.get('checkout');
        if (checkoutState === 'success') billingNotice = 'Checkout returned successfully. Activating your dashboard...';
        if (qs.get('checkout') === 'cancel') billingNotice = 'Checkout was canceled. Your account is saved and payment can be restarted.';
        if (qs.get('checkout')) window.history.replaceState({}, document.title, window.location.pathname + (window.location.hash || ''));
        appReady = true;
        if (currentUser && hasActiveSubscription()) {
            var hp = (window.location.hash || '').replace('#', '');
            currentPage = ['modules', 'home', 'learn', 'pipeline', 'phase5', 'insights', 'users', 'billing'].indexOf(hp) >= 0 ? hp : 'modules'
        }
        render();
        if (currentUser && checkoutState === 'success' && !hasActiveSubscription()) {
            pollCheckoutStatus().then(render).catch(function() {
                billingNotice = 'Payment completed, but the dashboard is still waiting for Stripe confirmation. Refresh in a moment.';
                render()
            })
        } else if (currentUser && checkoutState === 'success' && hasActiveSubscription()) {
            enterDashboard().then(render)
        }
    })
}

function setAuthField(key, val) {
    authForm[key] = val
}

function setBillingField(key, val) {
    billingForm[key] = val
}

function setUserField(key, val) {
    userForm[key] = val
}

function submitAuth() {
    authError = '';
    authNotice = '';
    var endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup';
    var payload = authMode === 'login' ? {
        email: authForm.email,
        password: authForm.password
    } : {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        company_name: authForm.company_name,
        contact_role: authForm.contact_role,
        contact_phone: authForm.contact_phone
    };
    apiPost(endpoint, payload).then(function(res) {
        var user = res.user || res;
        authNotice = authMode === 'login' ? 'Signed in.' : 'Account created.';
        return hydrateUser(user)
    }).then(function() {
        currentPage = hasActiveSubscription() ? 'modules' : 'billing';
        render()
    }).catch(function(e) {
        authError = e.message;
        render()
    })
}

function signOut() {
    flushSaveData().then(function() {
        return apiDel('/session')
    }).catch(function() {}).then(function() {
        currentUser = null;
        currentAccount = null;
        workspaceUsers = [];
        modules = [];
        products = [];
        productsLoaded = false;
        moduleMenuOpen = false;
        data = emptyData();
        currentPage = 'home';
        authMode = 'login';
        if (typeof refreshTeamChatVisibility === 'function') refreshTeamChatVisibility();
        render()
    })
}

function loadProducts() {
    if (!currentUser || !currentUser.is_account_owner) return Promise.resolve();
    return apiGet('/billing/products').then(function(items) {
        products = Array.isArray(items) ? items : [];
        productsLoaded = true;
        if (products.length && !billingForm.price_id) billingForm.price_id = products[0].price_id
    }).catch(function(e) {
        productsLoaded = true;
        billingError = e.message
    })
}

function startCheckout() {
    billingError = '';
    billingNotice = '';
    apiPost('/billing/checkout-session', billingForm).then(function(res) {
        if (res.account) {
            currentAccount = res.account;
            syncBillingForm()
        }
        if (res.checkout_url) {
            window.location.href = res.checkout_url;
            return
        }
        throw new Error('Stripe checkout URL was not returned.')
    }).catch(function(e) {
        billingError = e.message;
        render()
    })
}

function addWorkspaceUser() {
    apiPost('/users', userForm).then(function(res) {
        workspaceUsers = res.users || workspaceUsers;
        if (res.account) currentAccount = res.account;
        userForm = {
            name: '',
            email: '',
            password: '',
            role: 'Standard User',
            scope: 'Assigned work'
        };
        authNotice = 'User created.';
        render()
    }).catch(function(e) {
        authError = e.message;
        render()
    })
}

function removeWorkspaceUser(id) {
    apiDel('/users', {
        user_id: id
    }).then(function(res) {
        workspaceUsers = res.users || workspaceUsers;
        if (res.account) currentAccount = res.account;
        render()
    }).catch(function(e) {
        authError = e.message;
        render()
    })
}

function openResponsibleModule() {
    flushSaveData().then(function() {
        window.location.href = 'responsible-ai'
    })
}

function renderLoading() {
    setChrome(false);
    return '<div class="hero"><div class="hero-bg"></div><div class="hero-left"><div class="hero-eyebrow reveal">Next Chapter Academy</div><h1 class="hero-headline reveal">Connecting to <em>your workspace</em></h1><p class="hero-sub reveal">Loading account, subscription, modules, and saved pipeline data.</p></div></div>'
}

function renderAuth() {
    setChrome(false);
    var isLogin = authMode === 'login';
    var h = '<div class="hero"><div class="hero-bg"></div><div class="hero-left"><div class="hero-eyebrow reveal">Next Chapter Academy - Faisal Hoque</div><h1 class="hero-headline reveal">' + (isLogin ? 'Welcome <em>back</em>' : 'Create your <em>workspace</em>') + '</h1><p class="hero-sub reveal">' + (isLogin ? 'Sign in to continue into the AI innovation module library.' : 'Register the account owner, then choose a subscription to activate module access.') + '</p></div><div class="hero-right"><div class="card reveal" style="width:70%;padding:32px;background:rgba(26,22,18,.72);border-color:var(--rule)"><div class="section-label">' + (isLogin ? 'Login' : 'Register') + '</div>';
    if (authError) h += '<div style="padding:12px 14px;margin-bottom:16px;border:1px solid rgba(155,45,63,.45);color:#FCA5A5;background:rgba(155,45,63,.12);font-size:var(--font-16);">' + esc(authError) + '</div>';
    if (authNotice) h += '<div style="padding:12px 14px;margin-bottom:16px;border:1px solid rgba(27,107,90,.45);color:#86EFAC;background:rgba(27,107,90,.12);font-size:var(--font-16);">' + esc(authNotice) + '</div>';
    if (!isLogin) {
        h += fieldHtml('Full name', 'name', authForm.name, 'Jane Doe', 'setAuthField');
        h += fieldHtml('Company', 'company_name', authForm.company_name, 'Aurora Components', 'setAuthField')
    }
    h += fieldHtml('Email', 'email', authForm.email, 'you@company.com', 'setAuthField', 'email');
    h += fieldHtml('Password', 'password', authForm.password, 'Minimum 8 characters', 'setAuthField', 'password');
    if (!isLogin) {
        h += fieldHtml('Role / title', 'contact_role', authForm.contact_role, 'CEO, COO, Innovation Lead', 'setAuthField');
        h += fieldHtml('Phone', 'contact_phone', authForm.contact_phone, '+1 555 010 1000', 'setAuthField')
    }
    h += '<button class="btn-gold" style="width:100%;margin-top:8px" onclick="submitAuth()">' + (isLogin ? 'Sign In' : 'Create Account') + '</button><button class="btn-ghost" style="width:100%;margin-top:12px" onclick="authMode=\'' + (isLogin ? 'register' : 'login') + '\';authError=\'\';render()">' + (isLogin ? 'Create a new workspace' : 'Already have an account? Sign in') + '</button></div></div></div>';
    return h
}

function fieldHtml(label, key, val, placeholder, handler, type) {
    return '<div class="field"><label class="field-label">' + label + '</label><input class="field-input" type="' + (type || 'text') + '" value="' + esc(val || '') + '" placeholder="' + esc(placeholder || '') + '" oninput="' + handler + '(\'' + key + '\',this.value)"></div>'
}

function areaHtml(label, key, val, placeholder, handler) {
    return '<div class="field"><label class="field-label">' + label + '</label><textarea class="field-ta" placeholder="' + esc(placeholder || '') + '" oninput="' + handler + '(\'' + key + '\',this.value)">' + esc(val || '') + '</textarea></div>'
}

function closeProfileMenu() {
    var p = $('profilePanel');
    if (p) p.classList.remove('open')
}

function toggleProfileMenu() {
    var p = $('profilePanel');
    if (p) p.classList.toggle('open')
}

function renderProfileMenu() {
    var name = esc(currentUser ? (currentUser.name || currentUser.email || 'Account') : 'Account');
    return '<div class="profile-menu"><button class="btn-ghost profile-trigger" style="font-size:var(--font-control);padding:8px 18px" onclick="toggleProfileMenu()">Profile</button><div class="profile-panel" id="profilePanel"><div class="profile-name">' + name + '</div><button class="profile-item" onclick="closeProfileMenu();openHelp()">Help</button><button class="profile-item" onclick="closeProfileMenu();clearData()">Reset</button><button class="profile-item" onclick="closeProfileMenu();signOut()">Sign Out</button></div></div>'
}

function toggleModuleMenu(ev) {
    if (ev) ev.stopPropagation();
    moduleMenuOpen = !moduleMenuOpen;
    closeProfileMenu();
    render()
}

function moduleOpenAction(key) {
    if (key === 'ai_innovation_pipeline') return "openModuleItem('ai_innovation_pipeline')";
    if (key === 'responsible_ai_governance') return "openModuleItem('responsible_ai_governance')";
    return ''
}

function openModuleItem(key) {
    moduleMenuOpen = false;
    if (key === 'ai_innovation_pipeline') go('home');
    else if (key === 'responsible_ai_governance') openResponsibleModule()
}

function renderModuleDropdown(active) {
    var items = modules || [];
    var h = '<div class="nav-menu"><button class="nav-tab' + (active || moduleMenuOpen ? ' active' : '') + '" onclick="toggleModuleMenu(event)">Modules</button><div class="module-panel' + (moduleMenuOpen ? ' open' : '') + '" id="modulePanel">';
    if (!items.length) h += '<button class="module-item" disabled><div class="module-item-name">No modules available</div><div class="module-item-meta"><span>Catalog</span><span>Empty</span></div></button>';
    for (var i = 0; i < items.length; i++) {
        var m = items[i],
            action = moduleOpenAction(m.module_key),
            open = !!(action && m.enabled && m.status === 'active');
        var status = m.enabled ? (m.status === 'active' ? 'Open' : 'Coming Soon') : (m.status === 'active' ? 'Locked' : 'Coming Soon');
        h += '<button class="module-item" ' + (open ? 'onclick="' + action + '"' : 'disabled') + '><div class="module-item-name">' + esc(m.name) + '</div><div class="module-item-meta"><span>' + esc(m.subtitle || 'Module') + '</span><span>' + status + '</span></div></button>'
    }
    return h + '</div></div>'
}

function accountNavPages() {
    return [{
        id: 'modules',
        l: 'Modules'
    }, {
        id: 'users',
        l: 'Users'
    }, {
        id: 'billing',
        l: 'Billing'
    }]
}

function pipelineNavPages() {
    return [{
        id: 'modules',
        l: 'Modules'
    }, {
        id: 'home',
        l: 'Overview'
    }, {
        id: 'learn',
        l: 'Learn'
    }, {
        id: 'pipeline',
        l: 'Pipeline'
    }, {
        id: 'phase5',
        l: 'Navigate'
    }, {
        id: 'insights',
        l: 'Insights'
    }]
}

function renderBilling() {
    setChrome(hasActiveSubscription());
    if (hasActiveSubscription()) {
        var exp = currentAccount && currentAccount.subscription_current_period_end ? new Date(currentAccount.subscription_current_period_end.replace(' ', 'T')).toLocaleString() : 'Not available';
        return '<div style="padding-top:120px"><div class="wrap" style="padding-bottom:100px"><div class="section-label reveal">Billing</div><div class="section-title reveal">Current <em>subscription</em></div><p class="section-body reveal" style="margin-bottom:36px">This workspace is active. Plan limits control user seats and module access.</p><div class="grid-2" style="gap:24px"><div class="card" style="padding:32px"><div class="section-label">Plan</div><div style="font-family:var(--serif);font-size:44px;color:var(--paper);line-height:1">' + esc((currentAccount && currentAccount.plan_name) || 'Active Plan') + '</div><div class="gate-row" style="margin-top:20px"><span class="tag tag-go">' + esc((currentAccount && currentAccount.subscription_status) || 'active') + '</span><span class="tag tag-exp">' + ((currentAccount && currentAccount.seat_limit) || 1) + ' seats</span><span class="tag tag-ops">' + ((currentAccount && currentAccount.enabled_module_count) || 1) + '/' + ((currentAccount && currentAccount.module_limit) || 1) + ' modules</span></div></div><div class="card" style="padding:32px"><div class="section-label">Details</div><div style="font-size:var(--font-16);;color:var(--stone);line-height:2"><strong style="color:var(--paper)">Company:</strong> ' + esc((currentAccount && currentAccount.company_name) || '') + '<br><strong style="color:var(--paper)">Contact:</strong> ' + esc((currentAccount && currentAccount.contact_name) || '') + '<br><strong style="color:var(--paper)">Email:</strong> ' + esc((currentAccount && currentAccount.contact_email) || '') + '<br><strong style="color:var(--paper)">Renews / expires:</strong> ' + esc(exp) + '<br><strong style="color:var(--paper)">Stripe subscription:</strong> ' + esc((currentAccount && currentAccount.stripe_subscription_id) || 'Not recorded') + '</div></div></div></div></div>'
    }
    if (currentUser && currentUser.is_account_owner && !productsLoaded && !billingError) loadProducts().then(render);
    var h = '<div style="padding-top:120px"><div class="wrap" style="padding-bottom:100px"><div class="section-label reveal">Subscription</div><div class="section-title reveal">Activate <em>module access</em></div><p class="section-body reveal" style="margin-bottom:36px">Choose a Stripe subscription before entering the workspace. Plan limits control users and modules.</p>';
    if (billingError) h += '<div class="ctx-panel" style="border-color:rgba(155,45,63,.45)"><div class="ctx-stat" style="color:#FCA5A5">' + esc(billingError) + '</div></div>';
    if (billingNotice) h += '<div class="ctx-panel"><div class="ctx-stat">' + esc(billingNotice) + '</div></div>';
    if (!currentUser.is_account_owner) {
        return h + '<div class="card" style="padding:32px"><div class="section-title" style="font-size:34px">Waiting on account owner</div><p class="section-body">Only the owner can complete billing for ' + esc((currentAccount && currentAccount.company_name) || 'this workspace') + '.</p><button class="btn-ghost" onclick="signOut()">Sign out</button></div></div></div>'
    }
    h += '<div class="grid-2" style="gap:24px;align-items:start"><div class="card" style="padding:28px"><div class="section-label">Plans</div>';
    if (products.length === 0) h += '<p class="section-body">Loading Stripe products, or no active recurring prices were found.</p>';
    for (var i = 0; i < products.length; i++) {
        var p = products[i],
            sel = billingForm.price_id === p.price_id;
        h += '<button class="card card-link" style="width:100%;text-align:left;padding:20px;margin-bottom:12px;border-color:' + (sel ? 'var(--gold)' : 'rgba(245,242,236,.08)') + '" onclick="billingForm.price_id=\'' + p.price_id + '\';render()"><div style="display:flex;justify-content:space-between;gap:16px"><div><div style="font-family:var(--serif);font-size:24px;color:var(--paper)">' + esc(p.name) + '</div><div style="font-family:var(--sans);font-size:var(--font-control);color:var(--gold);letter-spacing:.1em;text-transform:uppercase;margin-top:4px">' + esc(p.subtitle || 'Subscription') + '</div></div><div style="font-family:var(--serif);font-size:24px;color:var(--gold)">' + formatMoney(p.unit_amount, p.currency) + '</div></div><div style="font-size:var(--font-16);color:var(--stone);margin-top:10px;line-height:1.6">' + esc(p.description || 'Workspace subscription') + '</div><div class="gate-row"><span class="tag tag-go">' + (p.seat_limit || 1) + ' seats</span><span class="tag tag-exp">' + (p.module_limit || 1) + ' modules</span></div></button>'
    }
    h += '</div><div class="card" style="padding:28px"><div class="section-label">Billing Details</div>' + fieldHtml('Company', 'company_name', billingForm.company_name, 'Company name', 'setBillingField') + fieldHtml('Billing contact', 'contact_name', billingForm.contact_name, 'Jane Doe', 'setBillingField') + fieldHtml('Billing email', 'contact_email', billingForm.contact_email, 'billing@company.com', 'setBillingField', 'email') + fieldHtml('Phone', 'contact_phone', billingForm.contact_phone, '+1 555 010 1000', 'setBillingField') + fieldHtml('Role / title', 'contact_role', billingForm.contact_role, 'Owner', 'setBillingField') + areaHtml('Billing notes', 'billing_notes', billingForm.billing_notes, 'PO number, tax notes, onboarding request...', 'setBillingField') + '<button class="btn-gold" onclick="startCheckout()">Continue to Stripe</button><button class="btn-ghost" style="margin-left:12px" onclick="signOut()">Sign out</button></div></div></div></div>';
    return h
}

function renderModules() {
    setChrome(true);
    var enabled = (modules || []).filter(function(m) {
            return m.enabled
        }).length,
        limit = (currentAccount && currentAccount.module_limit) || 1;
    var h = '<div style="padding-top:120px"><div class="wrap" style="padding-bottom:100px"><div class="section-label reveal">Module Library</div><div class="section-title reveal">Choose a <em>module</em></div><p class="section-body reveal" style="margin-bottom:36px">Your plan enables ' + enabled + ' of ' + limit + ' modules.</p><div class="grid-3" style="gap:16px">';
    for (var i = 0; i < modules.length; i++) {
        var m = modules[i],
            action = '';
        if (m.module_key === 'ai_innovation_pipeline') action = 'go(&quot;home&quot;)';
        if (m.module_key === 'responsible_ai_governance') action = 'openResponsibleModule()';
        var open = !!(action && m.enabled && m.status === 'active');
        h += '<div class="card card-link reveal" style="padding:26px;min-height:250px;display:flex;flex-direction:column;opacity:' + (m.enabled ? 1 : .62) + '" ' + (open ? 'onclick="' + action + '"' : '') + '><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px"><div style="font-family:var(--serif);font-size:42px;color:var(--gold);line-height:1">0' + (i + 1) + '</div><span class="tag ' + (m.enabled ? 'tag-go' : 'tag-nogo') + '">' + (m.enabled ? 'Enabled' : 'Locked') + '</span></div><div style="font-family:var(--serif);font-size:26px;font-weight:300;line-height:1.2;margin-bottom:10px">' + esc(m.name) + '</div><div style="font-family:var(--sans);font-size:var(--font-control);color:var(--gold);letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px">' + esc(m.subtitle || 'Module') + '</div><div style="font-size:var(--font-16);color:var(--papper);line-height:1.7;flex:1">' + esc(m.description || '') + '</div></div>'
    }
    return h + '</div></div></div>'
}

function renderUsers() {
    setChrome(true);
    var isOwner = currentUser && currentUser.is_account_owner,
        seatLimit = (currentAccount && currentAccount.seat_limit) || 1,
        count = (currentAccount && currentAccount.member_count) || workspaceUsers.length;
    var h = '<div style="padding-top:120px"><div class="wrap" style="padding-bottom:100px"><div class="section-label reveal">Workspace</div><div class="section-title reveal">User <em>management</em></div><p class="section-body reveal" style="margin-bottom:28px">Seats used: ' + count + ' / ' + seatLimit + '. Secondary users can work in the pipeline but cannot create additional users.</p>';
    if (authError) h += '<div class="ctx-panel" style="border-color:rgba(155,45,63,.45)"><div class="ctx-stat" style="color:#FCA5A5">' + esc(authError) + '</div></div>';
    h += '<div class="grid-2" style="gap:24px;align-items:start">';
    if (isOwner) h += '<div class="card" style="padding:28px"><div class="section-label">Add User</div>' + fieldHtml('Full name', 'name', userForm.name, 'Alex Smith', 'setUserField') + fieldHtml('Email', 'email', userForm.email, 'alex@company.com', 'setUserField', 'email') + fieldHtml('Password', 'password', userForm.password, 'Minimum 8 characters', 'setUserField', 'password') + fieldHtml('Role', 'role', userForm.role, 'Operations Lead', 'setUserField') + areaHtml('Scope', 'scope', userForm.scope, 'Assigned work, experiments, phase owner...', 'setUserField') + '<button class="btn-gold" onclick="addWorkspaceUser()" ' + (count >= seatLimit ? 'disabled' : '') + '>' + (count >= seatLimit ? 'Seat Limit Reached' : 'Create User') + '</button></div>';
    h += '<div class="card" style="padding:28px"><div class="section-label">Roster</div>';
    for (var i = 0; i < workspaceUsers.length; i++) {
        var u = workspaceUsers[i];
        h += '<div style="padding:14px 0;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;gap:16px"><div><div style="font-family:var(--serif);font-size:21px">' + esc(u.name) + '</div><div style="font-family:var(--sans);font-size:var(--font-control);color:var(--stone);letter-spacing:.08em">' + esc(u.email || '') + ' - ' + esc(u.role || 'User') + '</div><div style="font-size:var(--font-16);color:var(--stone);margin-top:6px">' + esc(u.scope || 'Assigned work') + '</div></div><div style="text-align:right"><span class="tag ' + (u.is_account_owner ? 'tag-go' : 'tag-exp') + '">' + (u.is_account_owner ? 'Owner' : 'User') + '</span>' + (isOwner && !u.is_account_owner ? '<div style="margin-top:10px"><button class="btn-ghost" style="font-size:var(--font-label);padding:6px 12px;color:#FCA5A5;border-color:rgba(155,45,63,.45)" onclick="removeWorkspaceUser(\'' + u.id + '\')">Remove</button></div>' : '') + '</div></div>'
    }
    return h + '</div></div></div></div>'
}

function render() {
    try {
        var app = $('app'),
            nt = $('navTabs'),
            nr = $('navRight');
        if (!appReady) {
            if (nt) nt.innerHTML = '';
            if (nr) nr.innerHTML = '';
            app.innerHTML = renderLoading();
            setTimeout(function() {
                var els = document.querySelectorAll('.reveal');
                for (var i = 0; i < els.length; i++) els[i].classList.add('visible')
            }, 50);
            return
        }
        if (!currentUser) {
            if (nt) nt.innerHTML = '';
            if (nr) nr.innerHTML = '';
            app.innerHTML = renderAuth();
            setTimeout(function() {
                var els = document.querySelectorAll('.reveal');
                for (var i = 0; i < els.length; i++) els[i].classList.add('visible')
            }, 50);
            return
        }
        if (!hasActiveSubscription() && currentPage !== 'billing') {
            currentPage = 'billing'
        }
        var accountPage = (currentPage === 'modules' || currentPage === 'users' || currentPage === 'billing');
        var pages = accountPage ? accountNavPages() : pipelineNavPages();
        var th = '';
        for (var i = 0; i < pages.length; i++) {
            var p = pages[i];
            var act = currentPage === p.id || (currentPage === 'step' && p.id === 'pipeline') || (currentPage === 'outcome' && p.id === 'pipeline') || (['nav-bluesky', 'nav-explore', 'nav-develop', 'launch-proj'].indexOf(currentPage) >= 0 && p.id === 'phase5');
            th += p.id === 'modules' ? renderModuleDropdown(act) : '<button class="nav-tab' + (act ? ' active' : '') + '" onclick="go(\'' + p.id + '\')">' + p.l + '</button>'
        }
        nt.innerHTML = th;
        nr.innerHTML = renderProfileMenu();
        var h = '';
        if (currentPage === 'modules') h = renderModules();
        else if (currentPage === 'users') h = renderUsers();
        else if (currentPage === 'billing') h = renderBilling();
        else if (currentPage === 'home') h = renderHome();
        else if (currentPage === 'learn') h = renderLearn();
        else if (currentPage === 'insights') h = renderInsights();
        else if (currentPage === 'pipeline') h = renderPipelineOverview();
        else if (currentPage === 'step') h = renderStep();
        else if (currentPage === 'phase') h = renderPhaseLandingPipe(currentPhase ? currentPhase.id : 1);
        else if (currentPage === 'outcome') h = renderOutcome();
        else if (currentPage === 'phase5') h = renderPhase5();
        else if (currentPage === 'nav-bluesky') h = renderNavBluesky();
        else if (currentPage === 'nav-explore') h = renderNavExplore();
        else if (currentPage === 'nav-develop') h = renderNavDevelop();
        else if (currentPage === 'launch-proj') h = renderLaunchProj();
        app.innerHTML = h;
        renderSidebar();
        setTimeout(function() {
            var els = document.querySelectorAll('.reveal');
            for (var i = 0; i < els.length; i++) {
                (function(el, d) {
                    setTimeout(function() {
                        el.classList.add('visible')
                    }, d)
                })(els[i], i * 60)
            }
        }, 50);
        if (coachOpen) renderCoachPanel();
        if (notesOpen) renderNotesPanel();
        updateNotesCount();
        updateVoiceUI();
    } catch (e) {
        $('app').innerHTML = '<div style="padding:120px 40px;color:#F87171;font-family:monospace"><h2>Error</h2><pre>' + e.message + '</pre></div>';
        console.error(e)
    }
}

function clearData() {
    if (confirm('Reset all progress?')) {
        localStorage.removeItem(SK);
        data = {
            ideas: [],
            selected: [],
            assessments: {},
            projects: {},
            completedSteps: {},
            completedSections: {},
            ownership: {},
            incentives: {},
            rhythm: {},
            portfolio: {},
            capAlloc: {},
            capital: {},
            experiments: {},
            expSelected: [],
            tracking: {},
            review: {},
            governance: {},
            stress: {},
            launched: [],
            opsData: {},
            notes: [],
            raci: {},
            purpose: {},
            knowledge: {},
            culture: {},
            decisions: {},
            audit: []
        };
        render()
    }
}

// ---------------------------------------
// === HOME ===
function renderHome() {
    var h = '<div class="hero"><div class="hero-bg"></div>';
    h += '<div class="hero-left">';
    h += '<div class="hero-eyebrow reveal">Next Chapter Academy &nbsp;·&nbsp; Faisal Hoque</div>';
    h += '<h1 class="hero-headline reveal">90 Days to an AI <em>Innovation Pipeline</em></h1>';
    h += '<p class="hero-sub reveal">AI adoption without structure is theatre. This framework transforms the aspiration into an operating discipline — from honest diagnosis through portfolio governance. The 90 days are the ignition. <strong>The engine runs forever.</strong></p>';
    h += '<div class="hero-btns reveal"><button class="btn-gold" onclick="go(\'pipeline\')">Start the Pipeline</button><button class="btn-ghost" onclick="go(\'learn\')">Read the Research</button></div>';
    h += '</div>';
    h += '<div class="hero-right"><div style="width:100%">';
    var stats = [{
            n: '01',
            t: 'Diagnose',
            d: 'Assess readiness, surface ideas, build the Blue Sky Portfolio.'
        },
        {
            n: '02',
            t: 'Organize',
            d: 'Assign ownership, realign incentives, establish rhythm.'
        },
        {
            n: '03',
            t: 'Prepare',
            d: 'Structure portfolio, allocate capital, design experiments.'
        },
        {
            n: '04',
            t: 'Ignite',
            d: 'Launch experiments, establish governance, first review.'
        },
        {
            n: '05',
            t: 'Navigate',
            d: 'Ongoing: manage the live pipeline with Buy/Sell/Hold discipline.'
        }
    ];
    for (var i = 0; i < stats.length; i++) {
        var s = stats[i];
        h += '<div class="reveal" style="display:flex;gap:24px;padding:20px 0;border-bottom:1px solid var(--rule)">' + '<div style="font-family:var(--serif);font-size:32px;font-weight:300;color:var(--gold);min-width:48px;line-height:1">' + s.n + '</div>' + '<div><div style="font-family:var(--serif);font-size:26px;font-weight:300;margin-bottom:4px">' + s.t + '</div><div style="font-size:16px;color:var(--pale);line-height:1.6;opacity:0.8">' + s.d + '</div></div></div>'
    }
    h += '</div></div>';
    h += '</div>';

    h += '<div class="marquee-wrap"><div class="marquee-track">';
    var mq = ['Diagnose', 'Organize', 'Prepare', 'Ignite', 'Navigate', 'AI Portfolio Strategy', 'Stage-Gate Discipline', 'Buy · Sell · Hold', '90-Day Transformation', 'Innovation Governance'];
    for (var r = 0; r < 2; r++)
        for (var i = 0; i < mq.length; i++) h += '<span class="marquee-item"><span class="marquee-dot"></span>' + mq[i] + '</span>';
    h += '</div></div>';

    h += '<div style="padding:100px 0;border-top:1px solid var(--rule)"><div class="wrap">';
    h += '<div class="grid-2" style="gap:64px;align-items:center">';
    h += '<div><div class="section-label reveal">Why This Matters</div><div class="pullquote reveal">Most organizations don\'t fail at AI because of technology. They fail because they treat AI initiatives as individual projects rather than a managed innovation portfolio.<cite>— Faisal Hoque, Fast Company</cite></div></div>';
    h += '<div class="grid-2" style="gap:16px">';
    var cards = [{
            t: 'Learn',
            d: 'Articles, books, and research behind every framework in this pipeline.',
            btn: 'Explore Library',
            pg: 'learn'
        },
        {
            t: 'Pipeline',
            d: 'The full 90-day journey — step by step, phase by phase.',
            btn: 'Begin Now',
            pg: 'pipeline'
        },
        {
            t: 'Navigate',
            d: 'Ongoing dashboard once your pipeline is operational.',
            btn: 'Open Dashboard',
            pg: 'phase5'
        },
        {
            t: 'From the Author',
            d: 'faisalhoque.com — writing, speaking, and advisory work.',
            btn: 'Visit Site',
            url: 'https://faisalhoque.com'
        }
    ];
    for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var click = c.url ? 'window.open(\'' + c.url + '\')' : 'go(\'' + c.pg + '\')';
        h += '<div class="card card-link reveal" style="padding:24px;display:flex;flex-direction:column;gap:12px;min-height:160px" onclick="' + click + '"><div style="font-family:var(--sans);font-size:var(--font-control);letter-spacing:.12em;text-transform:uppercase;color:var(--gold)">' + c.t + '</div><div style="font-family:var(--serif);font-size:26px;font-weight:300;line-height:1.3;flex:1">' + c.d + '</div><div class="card-arrow">' + c.btn + '</div></div>'
    }
    h += '</div></div></div></div>';
    return h;
}

// === LEARN ===
function renderLearn() {
    var ARTICLES = [{
            title: 'Here\'s How to Jump-Start Your Company\'s AI Transformation in 90 Days',
            desc: 'The complete framework — diagnosing readiness, building a portfolio, and establishing governance that sustains innovation.',
            url: 'https://faisalhoque.com/heres-how-to-jump-start-your-companys-ai-transformation-in-90-days/',
            tag: 'Foundation · Fast Company'
        },
        {
            title: 'The Right (and Wrong) Way for Leaders to Think About AI',
            desc: 'Starting from technology creates solutions looking for problems. Starting from purpose creates problems worth solving.',
            url: 'https://www.fastcompany.com',
            tag: 'Strategy · Fast Company'
        },
        {
            title: 'Three Myths That Undermine AI Success',
            desc: 'Why ownership, incentives, and culture matter more than the technology itself.',
            url: 'https://www.fastcompany.com',
            tag: 'Organization · Fast Company'
        },
        {
            title: 'Transform Your AI Adoption Strategy From a High-Stakes Gamble Into a Portfolio of Calculated Moves',
            desc: 'Stage-gate discipline, time horizons, and the difference between a portfolio and a project list.',
            url: 'https://www.imd.org',
            tag: 'Portfolio · I by IMD'
        },
        {
            title: 'When It Comes to AI, Innovation Isn\'t Enough',
            desc: 'The gap between technical success and organizational scale.',
            url: 'https://www.fastcompany.com',
            tag: 'Governance · Fast Company'
        },
        {
            title: 'If You Want to Get AI Right, Look Past the Technology',
            desc: 'How governance frameworks sustain innovation portfolios beyond the initial sprint.',
            url: 'https://www.fastcompany.com',
            tag: 'Governance · Fast Company'
        },
    ];
    var BOOKS = [{
            t: 'TRANSCEND',
            a: 'Faisal Hoque',
            d: 'USA Today & LA Times bestseller. Human potential in the age of machines.'
        },
        {
            t: 'Reimagining Government (2026)',
            a: 'Faisal Hoque et al.',
            d: 'AI transformation in government contexts. Post Hill Press / Simon & Schuster.'
        },
        {
            t: 'The Innovator\'s Dilemma',
            a: 'Clayton Christensen',
            d: 'Why successful companies fail when confronted with disruptive innovation.'
        },
        {
            t: 'The Lean Startup',
            a: 'Eric Ries',
            d: 'Build-Measure-Learn and the experiment-first approach to innovation.'
        },
        {
            t: 'Thinking in Bets',
            a: 'Annie Duke',
            d: 'Making smart decisions when you don\'t have all the information.'
        },
        {
            t: 'Only the Paranoid Survive',
            a: 'Andy Grove',
            d: 'Strategic inflection points and the discipline to act on them.'
        },
    ];
    var h = '<div style="padding-top:100px"><div class="wrap" style="padding-top:48px;padding-bottom:100px">';
    h += '<div class="section-label reveal">Research & Reading</div>';
    h += '<div class="section-title reveal">Foundation <em>Reading</em></div>';
    h += '<p class="section-body reveal" style="margin-bottom:48px">Every step in the 90-day pipeline is grounded in published research. Start with the anchor article — the others deepen each phase.</p>';
    h += '<div class="grid-2" style="gap:16px;margin-bottom:80px">';
    for (var i = 0; i < ARTICLES.length; i++) {
        var a = ARTICLES[i];
        h += '<a href="' + a.url + '" target="_blank" rel="noopener" class="card card-link reveal" style="padding:28px;display:flex;flex-direction:column;gap:12px;min-height:180px;text-decoration:none;color:inherit">';
        h += '<div style="font-family:var(--sans);font-size:var(--font-24);letter-spacing:.15em;text-transform:uppercase;color:var(--gold)">' + a.tag + '</div>';
        h += '<div style="font-family:var(--serif);font-size:26px;font-weight:300;line-height:1.3;flex:1">' + a.title + '</div>';
        h += '<div style="font-size:var(--font-16); color:var(--stone);line-height:1.6">' + a.desc + '</div>';
        h += '<div class="card-arrow" style="margin-top:auto">Read Article</div>';
        h += '</a>'
    }
    h += '</div>';
    h += '<div class="section-label reveal">Books</div><div class="section-title reveal" style="margin-bottom:40px">Essential <em>Reading</em></div>';
    h += '<div class="grid-2" style="gap:12px">';
    for (var i = 0; i < BOOKS.length; i++) {
        var b = BOOKS[i];
        h += '<div class="card reveal" style="padding:24px;display:flex;gap:16px"><div style="font-family:var(--serif);font-size:32px;color:var(--gold);line-height:1">&#9679;</div><div><div style="font-family:var(--serif);font-size:26px;font-weight:300">' + b.t + '</div><div style="font-family:var(--sans);font-size:var(--font-14);letter-spacing:.1em;color:var(--gold);margin:20px 0">' + b.a + '</div><div style="font-size:16px;color:var(--stone);line-height:1.6">' + b.d + '</div></div></div>'
    }
    h += '</div>';

    var VIDEOS = [{
            t: 'How to Transform AI Aspiration into Operational Discipline',
            a: 'Faisal Hoque · IMD Business School',
            d: 'The 90-day framework in practice — portfolio thinking, stage gates, and governance that lasts.',
            url: 'https://www.imd.org',
            dur: '18 min'
        },
        {
            t: 'Manage Your AI Investments Like a Portfolio',
            a: 'Harvard Business Review',
            d: 'Why portfolio discipline separates AI leaders from AI tourists.',
            url: 'https://hbr.org',
            dur: '12 min'
        },
        {
            t: 'The Right Way to Think About AI in Your Organization',
            a: 'MIT Sloan Management Review',
            d: 'Purpose-first versus technology-first: the strategic difference that determines outcomes.',
            url: 'https://sloanreview.mit.edu',
            dur: '15 min'
        },
        {
            t: 'Why Most AI Projects Fail — and What to Do About It',
            a: 'McKinsey Global Institute',
            d: 'The organizational, not technical, reasons AI initiatives don\'t scale.',
            url: 'https://www.mckinsey.com',
            dur: '20 min'
        },
        {
            t: 'Building an AI-Ready Culture',
            a: 'Deloitte Insights',
            d: 'How to shift incentives, structures, and behaviors to sustain AI innovation beyond the pilot stage.',
            url: 'https://www2.deloitte.com',
            dur: '14 min'
        },
        {
            t: 'The Human Side of AI Transformation',
            a: 'World Economic Forum',
            d: 'Why leadership, judgment, and human accountability remain the decisive variables.',
            url: 'https://www.weforum.org',
            dur: '16 min'
        },
    ];

    h += '<div style="margin-top:80px"><div class="section-label reveal">Videos</div><div class="section-title reveal" style="margin-bottom:40px">Watch & <em>Apply</em></div>';
    h += '<div class="grid-2" style="gap:12px">';
    for (var i = 0; i < VIDEOS.length; i++) {
        var v = VIDEOS[i];
        h += '<a href="' + v.url + '" target="_blank" rel="noopener" class="card card-link reveal" style="padding:24px;display:flex;gap:16px;text-decoration:none;color:inherit">';
        h += '<div style="width:40px;height:40px;border-radius:20px;background:rgba(184,137,42,.12);border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:var(--font-16);color:var(--gold);margin-left:2px">&#9679;</span></div>';
        h += '<div style="flex:1"><div style="font-family:var(--serif);font-size:26px;font-weight:300;line-height:1.3;margin-bottom:4px">' + v.t + '</div>';
        h += '<div style="font-family:var(--sans);font-size:var(--font-16);letter-spacing:.1em;margin: 15px 0px !important; color:var(--gold);margin-bottom:6px">' + v.a + ' · ' + v.dur + '</div>';
        h += '<div style="font-size:var(--font-16);color:var(--stone);line-height:1.6;">' + v.d + '</div></div>';
        h += '</a>'
    }
    h += '</div></div>';

    var PODCASTS = [{
            t: 'CONVERGENCE: The 90-Day Pipeline — From Theory to Operating Discipline',
            a: 'Faisal Hoque & Lauren Hawker Zafer',
            d: 'How organizations move from AI aspiration to an operational innovation pipeline with real stage gates.',
            url: '#',
            tag: 'CONVERGENCE'
        },
        {
            t: 'CONVERGENCE: The Kidnapper\'s Ransom Paradox',
            a: 'Faisal Hoque & Lauren Hawker Zafer',
            d: 'When AI convenience becomes dependency — and how portfolio discipline protects against it.',
            url: '#',
            tag: 'CONVERGENCE'
        },
        {
            t: 'CONVERGENCE: Agentic Enterprise — When AI Acts on Your Behalf',
            a: 'Faisal Hoque & Lauren Hawker Zafer',
            d: 'What happens to governance and accountability when AI agents become decision-makers.',
            url: '#',
            tag: 'CONVERGENCE'
        },
        {
            t: 'CONVERGENCE: The Governance Gap',
            a: 'Faisal Hoque & Lauren Hawker Zafer',
            d: 'Who decides what AI should do? The rules haven\'t caught up. The market won\'t wait.',
            url: '#',
            tag: 'CONVERGENCE'
        },
        {
            t: 'Acquired: AI Strategy Deep Dive',
            a: 'Ben Gilbert & David Rosenthal',
            d: 'How the best companies build durable AI competitive advantages through portfolio discipline.',
            url: 'https://www.acquired.fm',
            tag: 'External'
        },
        {
            t: 'Invest Like the Best: AI Investment Frameworks',
            a: 'Patrick O\'Shaughnessy',
            d: 'Portfolio theory applied to enterprise AI — balancing quick wins, medium-term bets, and long-term transformation.',
            url: 'https://www.joincolossus.com',
            tag: 'External'
        },
    ];

    h += '<div style="margin-top:80px"><div class="section-label reveal">Podcasts</div><div class="section-title reveal" style="margin-bottom:40px">Listen & <em>Challenge</em></div>';
    h += '<div class="grid-2" style="gap:12px">';
    for (var i = 0; i < PODCASTS.length; i++) {
        var p = PODCASTS[i];
        var isConv = p.tag === 'CONVERGENCE';
        h += '<a href="' + p.url + '" target="_blank" rel="noopener" class="card card-link reveal" style="padding:24px;display:flex;gap:16px;text-decoration:none;color:inherit' + (isConv ? ';border-color:rgba(184,137,42,.2);background:rgba(184,137,42,.03)' : '') + '">';
        h += '<div style="width:40px;height:40px;border-radius:20px;background:rgba(184,137,42,.12);border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px">&#9679;</div>';
        h += '<div style="flex:1"><div style="font-family:var(--sans);font-size:var(--font-16);letter-spacing:.15em;color:' + (isConv ? 'var(--gold)' : 'var(--stone)') + ';text-transform:uppercase;margin-bottom:6px">' + p.tag + '</div>';
        h += '<div style="font-family:var(--serif);font-size:26px;font-weight:300;line-height:1.3;margin-bottom:4px">' + p.t + '</div>';
        h += '<div style="font-family:var(--sans);font-size:var(--font-14);letter-spacing:.08em;color:var(--stone);margin-bottom:6px;margin:20px 0px;">' + p.a + '</div>';
        h += '<div style="font-size:18px;color:var(--stone);line-height:1.6">' + p.d + '</div></div>';
        h += '</a>'
    }
    h += '</div></div>';

    h += '</div></div>';
    return h;
}

// ---------------------------------------
// === PIPELINE ===
function renderPipeline() {
    var stages = getStages();
    var h = '<div style="padding-top:100px"><div class="wrap" style="padding-top:48px;padding-bottom:32px">';
    h += '<div class="section-label reveal">The 90-Day Journey</div>';
    h += '<div class="section-title reveal">Your <em>Innovation Pipeline</em></div>';
    h += '<p class="section-body reveal" style="margin-bottom:48px">Five phases. Structured progression. Each phase builds the infrastructure for the next. Work through every step in order — the sequence matters.</p>';

    // Pipeline viz
    h += '<div class="pipe-viz reveal">';
    var stageCounts = [stages.bluesky.length, stages.explore.length, stages.experiment.length, stages.operational.length];
    var stageLabels = ['Blue Sky', 'Exploration', 'Development', 'Operational'];
    var stageNavs = ['nav-bluesky', 'nav-explore', 'nav-develop', 'nav-ops'];
    for (var i = 0; i < stageLabels.length; i++) {
        h += '<div class="pipe-stage" onclick="go(\'phase5\')">';
        h += '<div class="pipe-stage-name" style="color:' + (['#1B6B5A', '#2D5A8E', '#8B5E3C', '#9B2D3F'][i]) + '">' + stageLabels[i] + '</div>';
        h += '<div class="pipe-stage-count" style="color:' + (['#1B6B5A', '#2D5A8E', '#8B5E3C', '#9B2D3F'][i]) + '">' + stageCounts[i] + '</div>';
        h += '<div style="font-family:var(--sans);font-size:var(--font-label);color:var(--stone);margin-top:4px;letter-spacing:.1em;text-transform:uppercase;font-weight:400">items</div>';
        h += '</div>'
    }
    h += '</div>';

    h += '</div>';

    // Phase grid
    h += '<div class="timeline-wrap reveal"><div class="wrap"><div class="timeline-phases">';
    for (var i = 0; i < PH.length; i++) {
        var ph = PH[i];
        var stepsTotal = ph.steps.length;
        var stepsDone = ph.steps.filter(function(s) {
            return isStepDone(s.id)
        }).length;
        h += '<div class="timeline-phase" onclick="go(\'step\',\'' + ph.steps[0].id + '\')" style="border-top:3px solid ' + ph.color + '">';
        h += '<div class="phase-num" style="color:' + ph.color + '">Phase ' + ph.id + ' · ' + ph.days + '</div>';
        h += '<div class="phase-name" style="color:var(--paper)">' + ph.name + '</div>';
        h += '<div class="phase-days">' + stepsDone + '/' + stepsTotal + ' complete</div>';
        h += '<div class="phase-steps">';
        for (var j = 0; j < ph.steps.length; j++) {
            var s = ph.steps[j];
            h += '<div style="color:' + (isStepDone(s.id) ? ph.color : 'var(--stone)') + '">' + s.icon + ' ' + s.name + '</div>'
        }
        h += '</div>';
        h += '<div style="margin-top:16px"><button class="btn-ghost" style="font-size:var(--font-label);padding:6px 14px;border-color:' + ph.color + ';color:' + ph.color + '">Enter Phase ?</button></div>';
        h += '</div>'
    }
    h += '</div></div></div>';
    h += '</div>';
    return h;
}

// === STEP ===
function renderStep() {
    if (!currentStep) return renderPipeline();
    var ph = currentPhase;
    if (!ph) return renderPipeline();
    var stepObj = null;
    for (var j = 0; j < ph.steps.length; j++) {
        if (ph.steps[j].id === currentStep) {
            stepObj = ph.steps[j];
            break
        }
    }
    if (!stepObj) return renderPipeline();

    var h = '<div class="content-area"><div class="content-inner">';
    // Breadcrumb
    h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">';
    h += '<button class="btn-ghost" style="font-size:var(--font-label);padding:6px 14px" onclick="go(\'pipeline\')">&larr; Pipeline</button>';
    h += '<div style="font-family:var(--sans);font-size:var(--font-control);color:var(--stone);letter-spacing:.08em">Phase ' + ph.id + ' · ' + ph.name + ' <span style="color:var(--gold)">/ ' + stepObj.name + '</span></div>';
    h += '</div>';

    // Step nav
    h += '<div class="step-nav">';
    for (var j = 0; j < ph.steps.length; j++) {
        var s = ph.steps[j];
        var done = isStepDone(s.id);
        h += '<button class="step-nav-btn' + (currentStep === s.id ? ' active' : '') + (done ? ' done' : '') + '" onclick="go(\'step\',\'' + s.id + '\')">';
        h += (done ? 'Done ' : s.icon + ' ') + s.name + '</button>'
    }
    h += '</div>';

    // Progress pips
    h += '<div class="step-progress">';
    for (var j = 0; j < ph.steps.length; j++) {
        var s = ph.steps[j];
        h += '<div class="step-pip' + (currentStep === s.id ? ' active' : isStepDone(s.id) ? ' done' : '') + '" title="' + s.name + '"></div>'
    }
    h += '</div>';

    // Header
    h += '<div class="step-header">';
    h += '<div class="step-eyebrow">Phase ' + ph.id + ' · ' + ph.days + ' · ' + ph.name + '</div>';
    h += '<h1 class="step-title">' + stepObj.icon + ' ' + stepObj.name + '</h1>';
    h += '</div>';

    // Context panel
    var ctx = CTX[currentStep];
    if (ctx) {
        h += '<div class="ctx-panel">';
        h += '<div class="ctx-insight">"' + ctx.insight + '"</div>';
        h += '<div class="ctx-stat">' + ctx.stat + '</div>';
        h += '<div class="ctx-source">Source: ' + ctx.article + ' <span style="color:var(--gold)">' + ctx.source + '</span></div>';
        h += '</div>';
    }

    // Step content
    h += renderStepContent(currentStep);

    // Milestone
    var ms = MILESTONES[currentStep];
    if (ms && isStepDone(currentStep)) {
        h += '<div class="milestone-card">';
        h += '<div class="milestone-label">Milestone Reached</div>';
        h += '<div class="milestone-text">' + ms + '</div>';
        h += '</div>';
    }

    // Navigation
    var allSteps = [];
    for (var i = 0; i < PH.length; i++)
        for (var j = 0; j < PH[i].steps.length; j++) allSteps.push(PH[i].steps[j]);
    var curIdx = allSteps.findIndex(function(s) {
        return s.id === currentStep
    });
    h += '<div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:24px;border-top:1px solid var(--rule)">';
    if (curIdx > 0) {
        var prev = allSteps[curIdx - 1];
        h += '<button class="btn-ghost" onclick="go(\'step\',\'' + prev.id + '\')">&larr; ' + prev.name + '</button>'
    } else {
        h += '<div></div>'
    }
    if (curIdx < allSteps.length - 1) {
        var next = allSteps[curIdx + 1];
        h += '<button class="btn-gold" onclick="go(\'step\',\'' + next.id + '\')">' + next.name + ' ?</button>'
    }
    h += '</div>';

    h += '</div></div>';
    return h;
}

// === PIPELINE STEP FUNCTIONS ===
// Step content is rendered by re-skinned pipeline module functions.
// The master's renderStep() provides the shell (breadcrumb, step nav, progress pips, header, context, nav buttons).
// renderStepContent() routes to the pipeline's step renderers.

function renderStepContent(id) {
    if (id === '1.1') return renderStep11();
    if (id === '1.2') return renderStep12();
    if (id === '1.3') return renderStep13();
    if (id === '2.1') return renderStep21();
    if (id === '2.2') return renderStep22();
    if (id === '2.3') return renderStep23();
    if (id === '2.4') return renderStep24();
    if (id === '3.1') return renderStep31();
    if (id === '3.2') return renderStep32();
    if (id === '3.3') return renderStep33();
    if (id === '4.1') return renderStep41();
    if (id === '4.2') return renderStep42();
    if (id === '4.3') return renderStep43();
    if (id === '4.4') return renderStep44();
    if (id === '5.1') return renderPhase5Content();
    return '<p style="color:var(--stone)">Coming soon.</p>';
}

// ---------------------------------------
// PIPELINE MODULE FUNCTIONS (re-skinned)
// === PIPELINE OVERVIEW ===
function renderPipelineOverview() {
    var h = '<div style="padding-top:100px"><div class="wrap" style="padding-top:48px;padding-bottom:32px;max-width:800px">';
    h += vizTimeline(0);
    h += '<div style="margin-bottom:32px">' + badge('90-Day Module', '#1B6B5A') + '<h1 style="font-family:var(--serif);font-size:clamp(28px,3.5vw,42px);font-weight:300;margin:12px 0 8px;line-height:1.2;color:var(--paper)">Build Your AI <em style="color:var(--gold)">Innovation Pipeline</em></h1><p style="font-size:16px;color:var(--stone);line-height:1.7">From standing start to functioning pipeline in 90 days.</p></div>';
    // Four pillars
    h += card('<div style="font-size:var(--font-16);;font-weight:700;color:#1B6B5A;margin-bottom:12px;font-family:var(--sans);letter-spacing:.1em;text-transform:uppercase">THE FOUR PILLARS</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + ['Leadership Mindset', 'Organizational Design', 'Capital Allocation', 'Innovation Pipeline'].map(function(p, i) {
        return '<div style="padding:12px;background:rgba(245,242,236,.04);border:1px solid rgba(245,242,236,.06);font-size:var(--font-16);;font-weight:500;color:var(--paper)"><span style="display:inline-block;width:20px;height:20px;border-radius:10px;background:#1B6B5A;color:#fff;text-align:center;line-height:20px;font-size:var(--font-readable-sm);margin-right:8px">' + (i + 1) + '</span>' + p + '</div>'
    }).join('') + '</div>', 'margin-bottom:20px;background:rgba(27,107,90,.06);border:1px solid rgba(27,107,90,.15)');
    // Phase cards
    PH.forEach(function(ph) {
        h += card('<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="go(\'phase-' + ph.id + '\')"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="display:inline-block;width:28px;height:28px;border-radius:14px;background:' + ph.color + ';color:#fff;text-align:center;line-height:28px;font-size:var(--font-16);;font-weight:700">' + ph.id + '</span><h3 style="font-size:16px;font-weight:700;margin:0;color:var(--paper)">' + ph.name + '</h3>' + badge(ph.days, ph.color) + '</div><div style="font-size:var(--font-16);color:var(--stone);margin-left:36px">' + ph.steps.map(function(s) {
            return s.name
        }).join(' \u2192 ') + '</div></div><span style="color:var(--gold);font-size:20px">\u2192</span></div>', 'margin-bottom:12px')
    });
    h += '</div></div>';
    return h
}


function vizTimeline(currentPhaseId) {
    var ranges = [{
        id: 1,
        start: 0,
        end: 30,
        name: 'Diagnose',
        color: '#1B6B5A'
    }, {
        id: 2,
        start: 31,
        end: 50,
        name: 'Organize',
        color: '#2D5A8E'
    }, {
        id: 3,
        start: 51,
        end: 65,
        name: 'Prepare',
        color: '#8B5E3C'
    }, {
        id: 4,
        start: 66,
        end: 90,
        name: 'Ignite',
        color: '#9B2D3F'
    }];
    var sd = new Date(data.startDate || new Date().toISOString().split('T')[0]);
    var today = new Date();
    var daysSince = Math.max(0, Math.floor((today - sd) / (1000 * 60 * 60 * 24)));
    var progress = Math.min(100, Math.max(0, (daysSince / 90) * 100));
    var phProg = function(pid) {
        var p = PH.find(function(x) {
            return x.id === pid
        });
        if (!p) return 0;
        var d = p.steps.filter(function(s) {
            return isStepDone(s.id)
        }).length;
        return p.steps.length ? Math.round(d / p.steps.length * 100) : 0
    };
    var h = '<div style="margin-bottom:24px"><div style="background:rgba(245,242,236,.03);border:1px solid rgba(245,242,236,.06);padding:16px 20px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-family:var(--sans);font-size:var(--font-control);font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.15em">90-Day Timeline</div><div style="font-family:var(--sans);font-size:var(--font-control);color:var(--stone)">Day ' + Math.min(90, daysSince) + ' of 90</div></div>';
    h += '<div style="display:flex;margin-bottom:6px">';
    ranges.forEach(function(p) {
        var w = ((p.end - p.start) / 90) * 100;
        h += '<div onclick="go(\'phase-' + p.id + '\')" style="width:' + w + '%;text-align:center;cursor:pointer;padding:2px 0"><div style="font-family:var(--sans);font-size:18px;font-weight:700;color:' + (currentPhaseId === p.id ? p.color : 'var(--stone)') + '">' + p.name + '</div><div style="font-family:var(--sans);font-size:var(--font-readable-xs);color:rgba(138,130,120,.5)">Days ' + (p.start === 0 ? 1 : p.start) + '\u2013' + p.end + '</div></div>'
    });
    h += '</div><div style="position:relative;height:10px;margin-bottom:6px;background:rgba(245,242,236,.06);border-radius:5px">';
    ranges.forEach(function(p) {
        var left = (p.start / 90) * 100;
        var w = ((p.end - p.start) / 90) * 100;
        var pp = phProg(p.id);
        h += '<div style="position:absolute;top:0;left:' + left + '%;width:' + w + '%;height:10px;border-radius:' + (p.id === 1 ? '5px 0 0 5px' : p.id === 4 ? '0 5px 5px 0' : '0') + '"><div style="height:100%;width:' + pp + '%;background:' + p.color + ';border-radius:' + (p.id === 1 ? '5px 0 0 5px' : p.id === 4 && pp === 100 ? '0 5px 5px 0' : '0') + ';transition:width .3s"></div></div>'
    });
    h += '<div style="position:absolute;top:-3px;left:' + progress + '%;width:3px;height:16px;background:var(--gold);border-radius:2px;z-index:3;transition:left .3s"></div></div>';
    h += '<div style="display:flex">';
    ranges.forEach(function(p) {
        var w = ((p.end - p.start) / 90) * 100;
        var pp = phProg(p.id);
        h += '<div onclick="go(\'phase-' + p.id + '\')" style="width:' + w + '%;text-align:center;cursor:pointer;padding:2px 0"><div style="font-family:var(--sans);font-size:var(--font-label);color:' + (pp === 100 ? '#1B6B5A' : 'var(--stone)') + ';font-weight:' + (pp === 100 ? 700 : 400) + '">' + pp + '%</div></div>'
    });
    h += '</div></div></div>';
    return h
}


// ---------------------------------------
// === STATE MANAGEMENT ===
// State management handled by mastercatch(e){return{}}}
// go() handled by master
function esc(s) {
    return s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function $(id) {
    return document.getElementById(id)
}

function val(id) {
    var e = $(id);
    return e ? e.value : ''
}

function setD(path, value) {
    var keys = path.split('.');
    var obj = data;
    for (var i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = value;
    saveData();
    render()
}

function updObj(base, field, val) {
    if (!data[base]) data[base] = {};
    data[base][field] = val;
    saveData();
    render()
}

function updNested(base, idx, field, val) {
    if (!data[base]) data[base] = {};
    if (!data[base][idx]) data[base][idx] = {};
    data[base][idx][field] = val;
    saveData();
    render()
}

// === PHASE data ===
// PH in master data

// STEP_CTX in master data

// STEP_MILES in master data

var PHASE_DESCS = {
    1: {
        n: 'The first phase is about honest discovery. What AI opportunities does your organization actually have? What\'s your real appetite for innovation?',
        arts: [{
            t: '90 Days to an AI Innovation Pipeline',
            s: 'Fast Company'
        }, {
            t: 'The right (and wrong) way for leaders to think about AI',
            s: 'Fast Company'
        }, {
            t: 'The dual challenge of AI',
            s: 'I by IMD'
        }]
    },
    2: {
        n: 'Ideas without infrastructure die. This phase builds the organizational machinery \u2014 ownership, incentives, rhythm, and deepened assessment.',
        arts: [{
            t: 'Three myths that undermine AI success',
            s: 'Fast Company'
        }, {
            t: 'The age of AI requires a new kind of leadership',
            s: 'Fast Company'
        }]
    },
    3: {
        n: 'With a validated portfolio and organizational readiness, you now structure the portfolio by time horizon, allocate capital, and design experiments.',
        arts: [{
            t: 'Transform your AI adoption strategy',
            s: 'I by IMD'
        }, {
            t: '7 things every leader must do to prepare for 2026',
            s: 'Fast Company'
        }]
    },
    4: {
        n: 'This is where plans meet reality. Launch experiments, establish governance, and conduct the first portfolio review.',
        arts: [{
            t: 'When it comes to AI, innovation isn\'t enough',
            s: 'Fast Company'
        }, {
            t: 'If you want to get AI right, look past the technology',
            s: 'Fast Company'
        }]
    }
};

var STEP_FLOW = {
    1: [{
        id: '1.1',
        icon: '01',
        sh: 'Assess'
    }, {
        id: '1.2',
        icon: '02',
        sh: 'Brainstorm'
    }, {
        id: '1.3',
        icon: '03',
        sh: 'Filter'
    }],
    2: [{
        id: '2.1',
        icon: '01',
        sh: 'Ownership'
    }, {
        id: '2.2',
        icon: '02',
        sh: 'Incentives'
    }, {
        id: '2.3',
        icon: '03',
        sh: 'Rhythm'
    }, {
        id: '2.4',
        icon: '04',
        sh: 'Deepen'
    }],
    3: [{
        id: '3.1',
        icon: '01',
        sh: 'Structure'
    }, {
        id: '3.2',
        icon: '02',
        sh: 'Capital'
    }, {
        id: '3.3',
        icon: '03',
        sh: 'Experiments'
    }],
    4: [{
        id: '4.1',
        icon: '\u25b6',
        sh: 'Launch'
    }, {
        id: '4.2',
        icon: '02',
        sh: 'Governance'
    }, {
        id: '4.3',
        icon: '03',
        sh: 'Stress Test'
    }, {
        id: '4.4',
        icon: '04',
        sh: 'Review'
    }]
};

// === HELPERS ===
function getScore(i) {
    var a = (data.assessments || {})[i];
    if (!a) return 0;
    return (a.priority || 0) + (a.risk || 0) + (a.value || 0) + (a.costScore || 0) + (a.difficulty || 0)
}

function getStages() {
    var d = data;
    var ideas = d.ideas || [],
        sel = d.selected || [],
        proj = d.projects || {},
        rev = d.review || {},
        lau = d.launched || [],
        exSel = d.expSelected || [];
    var op = lau.slice();
    exSel.forEach(function(i) {
        if (((rev.items || {})[i] || {}).decision === 'buy' && op.indexOf(i) < 0) op.push(i)
    });
    var goP = sel.filter(function(i) {
        return (proj[i] || {}).viable === true
    });
    var noP = sel.filter(function(i) {
        return (proj[i] || {}).viable === false
    });
    var exp = exSel.filter(function(i) {
        return op.indexOf(i) < 0
    });
    var expl = goP.filter(function(i) {
        return exSel.indexOf(i) < 0 && op.indexOf(i) < 0
    });
    var pend = sel.filter(function(i) {
        return goP.indexOf(i) < 0 && noP.indexOf(i) < 0
    });
    var unsel = ideas.map(function(_, i) {
        return i
    }).filter(function(i) {
        return sel.indexOf(i) < 0
    });
    return {
        bluesky: unsel.concat(pend),
        explore: expl,
        experiment: exp,
        operational: op,
        noGo: noP
    };
}

function isStepDone(sid) {
    var co = data.completedSections || {},
        cs = data.completedSteps || {};
    if (sid === '1.1') return !!(co['1.1'] && co['1.2'] && co['1.3'] && co['1.4'] && co['1.5']);
    if (sid === '1.2') return (data.ideas || []).length >= 3;
    if (sid === '1.3') return (data.selected || []).length > 0;
    return !!cs[sid];
}

function findPh(sid) {
    for (var i = 0; i < PH.length; i++) {
        var p = PH[i];
        for (var j = 0; j < p.steps.length; j++)
            if (p.steps[j].id === sid) return p;
        if (p.outcomes)
            for (var k = 0; k < p.outcomes.length; k++)
                if (p.outcomes[k].id === sid) return p
    }
    return null
}
// === SHARED UI BUILDERS ===
function badge(text, color) {
    return '<span class="bg" style="background:' + color + '18;color:' + color + '">' + esc(text) + '</span>'
}

function card(inner, style) {
    return '<div class="cd"' + (style ? ' style="' + style + '"' : '') + '>' + inner + '</div>'
}

function btn(label, onclick, cls, style, disabled) {
    return '<button class="btn ' + (cls || 'bp') + '"' + (onclick ? ' onclick="' + onclick + '"' : '') + (style ? ' style="' + style + '"' : '') + (disabled ? ' disabled' : '') + '>' + label + '</button>'
}

function ta(label, id, val, ph, rows) {
    return '<div style="margin-bottom:16px"><label style="display:block;font-size:var(--font-16);;font-weight:600;color:#F5F2EC;margin-bottom:6px">' + esc(label) + '</label><textarea id="' + id + '" rows="' + (rows || 3) + '" oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';syncRequiredButtons(this)" placeholder="' + esc(ph || '') + '" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(245,242,236,.12);font-size:16px;font-family:var(--sans,Helvetica Neue,sans-serif);box-sizing:border-box;resize:vertical;line-height:1.5;overflow-y:hidden">' + esc(val || '') + '</textarea></div>'
}

function sel(label, id, val, opts) {
    var h = '<div style="margin-bottom:16px"><label style="display:block;font-size:var(--font-16);;font-weight:600;color:#F5F2EC;margin-bottom:6px">' + esc(label) + '</label><select id="' + id + '" onchange="syncRequiredButtons(this)" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(245,242,236,.12);font-size:16px;font-family:var(--sans,Helvetica Neue,sans-serif);background:#fff">';
    opts.forEach(function(o) {
        h += '<option value="' + esc(o.v) + '"' + (val === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>'
    });
    return h + '</select></div>'
}

function likert(label, id, val, lo, hi) {
    var h = '<div style="margin-bottom:20px"><label style="display:block;font-size:var(--font-16);;font-weight:600;color:#F5F2EC;margin-bottom:8px">' + esc(label) + '</label><input type="hidden" value="' + esc(val || '') + '"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.5);min-width:70px">' + esc(lo) + '</span>';
    for (var n = 1; n <= 5; n++) {
        var s = val === n;
        h += '<button onclick="likSet(\'' + id + '\',' + n + ')" style="width:40px;height:40px;border-radius:8px;border:' + (s ? '2px solid #1B6B5A' : '1px solid rgba(245,242,236,.12)') + ';background:' + (s ? '#1B6B5A' : 'rgba(245,242,236,.06)') + ';color:' + (s ? '#fff' : '#F5F2EC') + ';font-size:15px;font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif)">' + n + '</button>'
    }
    return h + '<span style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.5);min-width:70px;text-align:right">' + esc(hi) + '</span></div></div>'
}

function ctxPanel(sid) {
    var c = CTX[sid];
    if (!c) return '';
    var open = UI.ctxOpen[sid];
    var h = '<div onclick="UI.ctxOpen[\'' + sid + '\']=!UI.ctxOpen[\'' + sid + '\'];render()" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(184,137,42,.04);border-radius:' + (open ? '10px 10px 0 0' : '10px') + ';cursor:pointer;border:1px solid rgba(184,137,42,.2);margin-bottom:' + (open ? '0' : '20') + 'px"><span style="font-size:16px">&#9679;</span><span style="font-size:var(--font-16);;font-weight:600;color:#d4cfca;flex:1">Why This Matters</span><span style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.5)">' + (open ? '\u25be' : '\u25b8') + '</span></div>';
    if (open) {
        h += '<div style="padding:16px 20px;background:rgba(245,242,236,.03);border:1px solid rgba(184,137,42,.2);border-top:none;border-radius:0 0 10px 10px;margin-bottom:20px"><p style="font-size:var(--font-16);;color:#e0dbd5;line-height:1.7;font-style:italic;margin-bottom:12px">\u201c' + esc(c.i) + '\u201d</p>';
        if (c.s) h += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 12px;background:#3b291b;border-radius:6px;margin-bottom:12px"><span style="font-size:16px;flex-shrink:0">&#9679;</span><span style="font-size:var(--font-16);color:#d4cfca;line-height:1.5">' + esc(c.s) + '</span></div>';
        h += '<div style="display:flex;align-items:center;gap:6px;font-size:var(--font-readable-sm);color:rgba(138,130,120,.7)"><span>&#9679;</span><span style="font-weight:600">' + esc(c.a) + '</span><span>\xb7 ' + esc(c.src) + '</span></div></div>'
    }
    return h
}

function milestone(sid) {
    var m = MILESTONES[sid];
    if (!m || !isStepDone(sid)) return '';
    return '<div style="margin-top:16px;padding:14px 18px;background:rgba(27,107,90,.06);border:1px solid rgba(27,107,90,.3);border-radius:10px;display:flex;align-items:center;gap:12px"><div style="width:32px;height:32px;border-radius:16px;background:#1B6B5A;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">\u2713</div><div><div style="font-size:var(--font-16);font-weight:700;color:#1B6B5A;text-transform:uppercase;letter-spacing:.5px">Milestone Reached</div><div style="font-size:var(--font-16);;color:#d4cfca;line-height:1.5">' + esc(m) + '</div></div></div>'
}

function vp(code, title, dur) {
    return '<div class="vp"><div style="width:48px;height:48px;border-radius:24px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:20px;color:#fff;margin-left:3px">\u25b6</span></div><div><div style="font-size:16px;font-weight:700;color:#fff">' + esc(title) + '</div><div style="font-size:18px;color:var(--paper);margin-top:2px">' + esc(dur) + ' \xb7 ' + esc(code) + '</div></div></div>'
}

function syncRequiredButtons(el) {
    var scope = document;
    if (el && el.closest) {
        var localCard = el.closest('.cd');
        if (localCard && localCard.querySelector('.js-done-wrap')) scope = localCard;
    }
    (scope ? scope.querySelectorAll('.js-done-wrap') : document.querySelectorAll('.js-done-wrap')).forEach(function(wrap) {
        var card = wrap.closest('.cd') || wrap.parentElement;
        if (!card) return;
        var required = [];
        card.querySelectorAll('label').forEach(function(label) {
            if (label.textContent.indexOf('*') < 0) return;
            var holder = label.parentElement || card;
            var field = holder.querySelector('textarea,input,select');
            if (field) required.push(field);
        });
        if (!required.length) return;
        var complete = required.every(function(field) {
            return String(field.value || '').trim().length > 0
        });
        var button = wrap.querySelector('button');
        if (button) button.disabled = !complete;
        var msg = wrap.querySelector('.js-required-msg');
        if (msg) msg.style.display = complete ? 'none' : 'block';
    });
}
document.addEventListener('input', function(e) {
    if (e.target && e.target.matches && e.target.matches('input,textarea,select')) syncRequiredButtons(e.target)
}, true);
document.addEventListener('change', function(e) {
    if (e.target && e.target.matches && e.target.matches('input,textarea,select')) syncRequiredButtons(e.target)
}, true);

function doneBtn(onclick, disabled, label) {
    return '<div class="js-done-wrap" style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(245,242,236,.06)">' + btn(label || '\u2713 Mark Complete & Continue \u2192', onclick, 'bd', 'padding:14px 20px;font-size:15px', disabled) + '<p class="js-required-msg" style="font-size:var(--font-16);color:rgba(138,130,120,.5);margin-top:8px;text-align:center;display:' + (disabled ? 'block' : 'none') + '">Complete required fields (*) first.</p></div>'
}

function pipeViz(activeStage, navMap) {
    var st = getStages();
    var nm = navMap || {
        bluesky: 'out-bluesky',
        explore: 'out-explore',
        experiment: 'out-expbriefs',
        operate: 'out-oper'
    };
    var stages = [{
        k: 'bluesky',
        n: 'Blue Sky',
        c: '#1B6B5A',
        cnt: st.bluesky.length,
        nav: nm.bluesky
    }, {
        k: 'explore',
        n: 'Exploration',
        c: '#2D5A8E',
        cnt: st.explore.length,
        nav: nm.explore
    }, {
        k: 'experiment',
        n: 'Development',
        c: '#8B5E3C',
        cnt: st.experiment.length,
        nav: nm.experiment
    }, {
        k: 'operate',
        n: 'Operational',
        c: '#9B2D3F',
        cnt: (st.operational || []).length,
        nav: nm.operate
    }];
    var h = '<div style="display:flex;align-items:center;margin-bottom:32px;gap:0">';
    stages.forEach(function(s, i) {
        var lit = s.cnt > 0 || s.k === 'bluesky';
        h += '<div style="flex:1;opacity:' + (lit ? 1 : .4) + ';cursor:pointer" onclick="go(\'' + s.nav + '\')"><svg viewBox="0 0 200 80" style="width:100%;height:70px"><path d="' + (i === 0 ? 'M 0 0 L 170 0 L 200 40 L 170 80 L 0 80 Z' : 'M 0 0 L 170 0 L 200 40 L 170 80 L 0 80 L 30 40 Z') + '" fill="' + s.c + '" opacity="' + (s.k === activeStage ? 1 : .5) + '"' + (s.k === activeStage ? ' stroke="#000" stroke-width="1.5"' : '') + '/><text x="' + (i === 0 ? 85 : 100) + '" y="35" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="Helvetica Neue,Arial,sans-serif">' + s.n + '</text><text x="' + (i === 0 ? 85 : 100) + '" y="55" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="11" font-family="Helvetica Neue,Arial,sans-serif">' + s.cnt + ' item' + (s.cnt !== 1 ? 's' : '') + '</text></svg></div>'
    });
    return h + '</div>'
}
// Sidebar/topbar handled by master

// Home handled by master
function renderPhaseLandingPipe(phaseId) {
    var p = PH.find(function(x) {
        return x.id === phaseId
    });
    if (!p) return '';
    var _w = '<div style="padding-top:110px"><div class="wrap" style="max-width:800px;padding:0 24px 80px">';
    var _we = '</div></div>';
    var desc = PHASE_DESCS[phaseId] || {};
    var flow = STEP_FLOW[phaseId] || [];
    var done = p.steps.filter(function(s) {
        return isStepDone(s.id)
    }).length;
    var total = p.steps.length;
    var pct = total ? Math.round(done / total * 100) : 0;

    var ideas = data.ideas || [],
        as = data.assessments || {},
        sel = data.selected || [],
        ow = data.ownership || {},
        rh = data.rhythm || {},
        proj = data.projects || {},
        cap = data.capital || {},
        port = data.portfolio || {},
        exp = data.experiments || {},
        exSel = data.expSelected || [],
        trk = data.tracking || {},
        gov = data.governance || {},
        cu = data.culture || {};
    var cs = Object.values(cu).filter(function(v) {
        return typeof v === 'number'
    });
    var cScore = cs.length ? (cs.reduce(function(a, b) {
        return a + b
    }, 0) / cs.length).toFixed(1) : '\u2014';

    var metrics = phaseId === 1 ? [{
            l: 'Ideas Generated',
            v: ideas.length,
            ic: ''
        }, {
            l: 'Ideas Filtered',
            v: sel.length,
            ic: ''
        }, {
            l: 'Culture Score',
            v: cScore + '/5',
            ic: ''
        }, {
            l: 'Sections Done',
            v: Object.keys(data.completedSections || {}).filter(function(k) {
                return (data.completedSections || {})[k]
            }).length + '/5',
            ic: ''
        }] :
        phaseId === 2 ? [{
            l: 'Owner Set',
            v: ow.ownerName ? 'Yes' : 'No',
            ic: ''
        }, {
            l: 'RACI Items',
            v: Object.keys(data.raci || {}).length,
            ic: ''
        }, {
            l: 'Rhythm Set',
            v: rh.day ? 'Yes' : 'No',
            ic: ''
        }, {
            l: 'Projects Deepened',
            v: sel.filter(function(i) {
                return (proj[i] || {}).viable !== undefined
            }).length,
            ic: ''
        }] :
        phaseId === 3 ? [{
            l: 'Portfolio Items',
            v: Object.keys(port).length,
            ic: ''
        }, {
            l: 'Budget Set',
            v: cap.required ? 'Yes' : 'No',
            ic: ''
        }, {
            l: 'Experiments Designed',
            v: Object.keys(exp).filter(function(k) {
                return exp[k] && exp[k].owner
            }).length,
            ic: ''
        }, {
            l: 'Quick Wins',
            v: Object.keys(port).filter(function(k) {
                return port[k] && port[k].horizon === 'quick'
            }).length,
            ic: ''
        }] : [{
            l: 'Experiments Launched',
            v: Object.keys(trk).filter(function(k) {
                return trk[k] && trk[k].status
            }).length,
            ic: '\u25b6'
        }, {
            l: 'Governance Set',
            v: gov.meeting ? 'Yes' : 'No',
            ic: ''
        }, {
            l: 'Review Done',
            v: (data.completedSteps || {})['4.4'] ? 'Yes' : 'No',
            ic: ''
        }, {
            l: 'Stress Tested',
            v: (data.completedSteps || {})['4.3'] ? 'Yes' : 'No',
            ic: ''
        }];

    var mNav = {
        1: {
            '0': '1.2',
            '1': '1.3',
            '2': '1.1',
            '3': '1.1'
        },
        2: {
            '0': '2.1',
            '1': 'out-raci',
            '2': '2.3',
            '3': '2.4'
        },
        3: {
            '0': '3.1',
            '1': '3.2',
            '2': '3.3',
            '3': 'out-expbriefs'
        },
        4: {
            '0': '4.1',
            '1': '4.2',
            '2': '4.4',
            '3': '4.3'
        }
    };

    var h = _w + vizTimeline(phaseId);
    h += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px"><div style="width:64px;height:64px;border-radius:32px;background:' + p.color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:600;flex-shrink:0">' + phaseId + '</div><div><div style="display:flex;align-items:center;gap:8px"><h1 style="font-size:24px;font-weight:500;margin:0">' + p.name + '</h1>' + badge(p.days, p.color) + '</div><p style="color:#8A8278;font-size:16px;line-height:1.5;margin:6px 0 0">' + esc(desc.n || '') + '</p></div></div>';

    // Metrics
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:24px">';
    metrics.forEach(function(m, i) {
        var dest = (mNav[phaseId] || {})[i];
        h += card('<div style="text-align:center;cursor:' + (dest ? 'pointer' : 'default') + '" onclick="' + (dest ? 'go(\'' + dest + '\')' : '') + '" ><div style="font-size:20px">' + m.ic + '</div><div style="font-size:18px;font-weight:600;color:' + p.color + ';margin-top:4px">' + m.v + '</div><div style="font-size:var(--font-control);color:rgba(138,130,120,.7);font-weight:600;text-transform:uppercase;margin-top:2px">' + m.l + '</div></div>', 'padding:16px;border-top:3px solid ' + p.color)
    });
    h += '</div>';

    // Progress
    h += card('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="font-size:17px;font-weight:700;margin:0">Progress</h3>' + badge(done + '/' + total + ' steps \xb7 ' + pct + '%', pct === 100 ? '#1B6B5A' : p.color) + '</div><div style="height:8px;background:rgba(245,242,236,.04);border-radius:4px;overflow:hidden;margin-bottom:16px"><div style="height:100%;width:' + pct + '%;background:' + (pct === 100 ? '#1B6B5A' : p.color) + ';border-radius:4px;transition:width .3s"></div></div><div style="display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:wrap">' + flow.map(function(s, i) {
        var d = isStepDone(s.id);
        var r = '<div onclick="go(\'' + s.id + '\')" style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:8px 12px;border-radius:8px;background:' + (d ? 'rgba(27,107,90,.06)' : 'transparent') + ';min-width:70px"><div style="width:36px;height:36px;border-radius:18px;background:' + (d ? '#1B6B5A' : p.color + '20') + ';color:' + (d ? '#fff' : p.color) + ';display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid ' + (d ? '#1B6B5A' : p.color) + '">' + (d ? '\u2713' : s.icon) + '</div><div style="font-size:var(--font-control);font-weight:600;color:' + (d ? '#1B6B5A' : '#8A8278') + ';text-align:center">' + s.sh + '</div></div>';
        if (i < flow.length - 1) r += '<div style="width:24px;height:2px;background:' + (d && isStepDone(flow[i + 1].id) ? '#1B6B5A' : 'rgba(245,242,236,.12)') + ';margin-top:-12px;flex-shrink:0"></div>';
        return r
    }).join('') + '</div>', 'margin-bottom:24px');

    // Steps + Outcomes grid
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px"><div><div style="font-size:var(--font-16);font-weight:700;color:rgba(138,130,120,.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Steps</div>';
    p.steps.forEach(function(s) {
        var d = isStepDone(s.id);
        h += '<div onclick="go(\'' + s.id + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(245,242,236,.03);border:1px solid rgba(245,242,236,.06);border-radius:8px;margin-bottom:6px;cursor:pointer;border-left:3px solid ' + (d ? '#1B6B5A' : p.color) + '"><div style="width:20px;height:20px;border-radius:10px;background:' + (d ? '#1B6B5A' : p.color + '20') + ';color:' + (d ? '#fff' : p.color) + ';display:flex;align-items:center;justify-content:center;font-size:var(--font-control);font-weight:700;flex-shrink:0">' + (d ? '\u2713' : s.id.split('.')[1]) + '</div><span style="font-size:var(--font-16);;font-weight:600;color:' + (d ? '#1B6B5A' : '#F5F2EC') + ';flex:1">' + s.name + '</span>' + (d ? '<span style="font-size:var(--font-control);color:#1B6B5A">\u2713</span>' : '') + '</div>'
    });
    h += '</div><div><div style="font-size:var(--font-16);font-weight:700;color:rgba(138,130,120,.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Outcomes</div>';
    (p.outcomes || []).forEach(function(o) {
        h += '<div onclick="go(\'' + o.id + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(245,242,236,.03);border:1px solid rgba(245,242,236,.06);border-radius:8px;margin-bottom:6px;cursor:pointer;border-left:3px solid ' + p.color + '"><span style="font-size:15px">' + o.icon + '</span><span style="font-size:var(--font-16);;font-weight:600;flex:1">' + o.name + '</span><span style="color:rgba(138,130,120,.7);font-size:var(--font-16)">\u2192</span></div>'
    });
    h += '</div></div>';

    // Articles
    if (desc.arts) {
        h += card('<div style="font-size:var(--font-16);font-weight:700;color:rgba(138,130,120,.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Recommended Reading</div>' + desc.arts.map(function(a) {
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(245,242,236,.02);border-radius:6px;margin-bottom:4px"><span style="font-size:16px">&#9679;</span><span style="font-size:var(--font-16);font-weight:600">' + esc(a.t) + '</span><span style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.7)">\xb7 ' + esc(a.s) + '</span></div>'
        }).join(''), 'margin-bottom:24px')
    }

    // Completion
    if (pct === 100) {
        var msg = phaseId === 1 ? 'You\'ve diagnosed your organization\'s AI readiness and built a ranked portfolio.' : phaseId === 2 ? 'Your organizational machinery is in place.' : phaseId === 3 ? 'Portfolio structured, capital allocated, experiments designed.' : 'Experiments launched, governance established, first review complete.';
        var next = phaseId < 4 ? 'phase-' + (phaseId + 1) : '5.1';
        var nextLabel = phaseId < 4 ? 'Continue to Phase ' + (phaseId + 1) + ': ' + PH[phaseId].name + ' \u2192' : 'Go to Pipeline Dashboard \u2192';
        h += card('<div style="text-align:center"><div style="font-size:24px;margin-bottom:8px">&#9679;</div><h3 style="font-size:17px;font-weight:700;margin:0 0 4px">Phase ' + phaseId + ' Complete</h3><p style="font-size:var(--font-16);;color:#d4cfca">' + esc(msg) + '</p>' + btn(nextLabel, 'go(\'' + next + '\')', 'bp', 'margin-top:12px') + '</div>', 'background:rgba(27,107,90,.06);border:2px solid #1B6B5A')
    }
    return h + _we
}
// === PHASE 1 STEPS ===
// Likert setter helper
function likSet(path, n) {
    var parts = path.split('.');
    if (parts.length === 2) updObj(parts[0], parts[1], n);
    else if (parts.length === 1) data[parts[0]] = n;
    saveData();
    render()
}
// Generic field change from DOM
function chg(base, field) {
    var v = val(base + '_' + field);
    updObj(base, field, v)
}

function chgNested(base, idx, field) {
    var v = val(base + '_' + idx + '_' + field);
    updNested(base, idx, field, v)
}

function renderStep11() {
    var p = data.purpose || {},
        k = data.knowledge || {},
        cu = data.culture || {},
        au = data.audit || [],
        de = data.decisions || {},
        co = data.completedSections || {};
    var sec = UI.sec;
    var secs = [{
        id: '1.1',
        l: 'Purpose',
        c: !!co['1.1']
    }, {
        id: '1.2',
        l: 'AI Knowledge',
        c: !!co['1.2']
    }, {
        id: '1.3',
        l: 'Risk & Culture',
        c: !!co['1.3']
    }, {
        id: '1.4',
        l: 'Innovation Audit',
        c: !!co['1.4'],
        inv: true
    }, {
        id: '1.5',
        l: 'Decision Rights',
        c: !!co['1.5'],
        inv: true
    }];
    var allC = secs.every(function(s) {
        return s.c
    });
    var h = vp('V-1.1.1', 'Assessment Battery', '3\u20135 min');
    h += ctxPanel('1.1');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 1: Assessment Battery</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Complete all five sections. Outputs available under Outcomes when done.</p>';

    // Section tabs
    h += '<div style="margin-bottom:24px"><div style="font-size:var(--font-readable-sm);font-weight:600;color:rgba(138,130,120,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Questionnaire</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
    secs.filter(function(s) {
        return !s.inv
    }).forEach(function(s) {
        h += '<button onclick="UI.sec=\'' + s.id + '\';render()" style="padding:10px 18px;border-radius:8px;font-size:var(--font-16);;font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (sec === s.id ? '2px solid #1B6B5A' : '1px solid rgba(245,242,236,.12)') + ';background:' + (s.c ? 'rgba(27,107,90,.08)' : 'rgba(245,242,236,.03)') + ';color:' + (sec === s.id || s.c ? '#1B6B5A' : '#8A8278') + '">' + (s.c ? '\u2713' : '\u25cb') + ' ' + s.l + '</button>'
    });
    h += '</div><div style="font-size:var(--font-readable-sm);font-weight:600;color:rgba(138,130,120,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Investigative</div><div style="display:flex;gap:8px;flex-wrap:wrap">';
    secs.filter(function(s) {
        return s.inv
    }).forEach(function(s) {
        h += '<button onclick="UI.sec=\'' + s.id + '\';render()" style="padding:10px 18px;border-radius:8px;font-size:var(--font-16);;font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (sec === s.id ? '2px solid #1B6B5A' : '1px solid rgba(245,242,236,.12)') + ';background:' + (s.c ? 'rgba(27,107,90,.08)' : 'rgba(245,242,236,.03)') + ';color:' + (sec === s.id || s.c ? '#1B6B5A' : '#8A8278') + '">' + (s.c ? '\u2713' : '\u25cb') + ' ' + s.l + '</button>'
    });
    h += '</div></div>';

    if (sec === '1.1') {
        h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">1.1 Reaffirm Your Purpose</h3><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Start with what your organization exists to do.</p>' + ta('Mission *', 'p_mission', p.mission, 'e.g. We design and manufacture...', 3) + ta('Values', 'p_values', p.values, 'e.g. Quality, Partnership...', 2) + ta('Short-term priorities', 'p_shortTerm', p.shortTerm, 'Next 6 months', 2) + ta('Medium-term', 'p_mediumTerm', p.mediumTerm, '6\u201318 months', 2) + ta('Long-term', 'p_longTerm', p.longTerm, '18+ months', 2) + ta('Key goals *', 'p_goals', p.goals, 'e.g. 1. Revenue growth...', 3) + ta('Friction points *', 'p_frictions', p.frictions, 'e.g. 1. Slow quoting...', 4) + doneBtn('saveSection11()', !(p.mission && p.goals && p.frictions)))
    }
    if (sec === '1.2') {
        h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">1.2 AI Knowledge Base</h3><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">What your org knows and can do with AI.</p>' + sel('Current usage *', 'k_usage', k.usage, [{
            v: '',
            l: 'Select...'
        }, {
            v: 'none',
            l: 'None'
        }, {
            v: 'basic',
            l: 'Basic'
        }, {
            v: 'moderate',
            l: 'Moderate'
        }, {
            v: 'advanced',
            l: 'Advanced'
        }]) + likert('Leadership awareness *', 'knowledge.awareness', k.awareness, 'Unaware', 'Very aware') + sel('Technical resources', 'k_resources', k.resources, [{
            v: '',
            l: 'Select...'
        }, {
            v: 'none',
            l: 'None'
        }, {
            v: 'limited',
            l: 'Limited'
        }, {
            v: 'moderate',
            l: 'Moderate'
        }, {
            v: 'strong',
            l: 'Strong'
        }]) + sel('Learning processes', 'k_learning', k.learning, [{
            v: '',
            l: 'Select...'
        }, {
            v: 'none',
            l: 'None'
        }, {
            v: 'informal',
            l: 'Informal'
        }, {
            v: 'some',
            l: 'Some'
        }, {
            v: 'systematic',
            l: 'Systematic'
        }]) + doneBtn('saveSection12()', !(k.usage && k.awareness)))
    }
    if (sec === '1.3') {
        h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">1.3 Risk & Culture</h3><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Culture is the primary barrier.</p>' + likert('Uncertainty *', 'culture.uncertainty', cu.uncertainty, 'Uncomfortable', 'Comfortable') + likert('AI legitimacy *', 'culture.aiLegitimacy', cu.aiLegitimacy, 'Stigma', 'Accepted') + likert('New proposals', 'culture.newProposals', cu.newProposals, 'Shut down', 'Support') + likert('Incentives', 'culture.incentives', cu.incentives, 'Punish', 'Reward') + likert('Frontline', 'culture.frontline', cu.frontline, 'None', 'Strong') + likert('Overall *', 'culture.overall', cu.overall, 'Stagnant', 'Innovative') + doneBtn('saveSection13()', !(cu.uncertainty && cu.aiLegitimacy && cu.overall)))
    }
    if (sec === '1.4') {
        h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">1.4 Innovation Audit</h3><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Inventory every initiative.</p>' + au.map(function(item, i) {
            return '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center"><input id="au_' + i + '_name" value="' + esc(item.name) + '" placeholder="Name" onchange="saveAudit()" style="flex:2;padding:8px;border:1px solid rgba(245,242,236,.12);border-radius:6px;font-size:var(--font-16);;font-family:var(--sans,Helvetica Neue,sans-serif)"/><select id="au_' + i + '_status" onchange="saveAudit()" style="padding:8px;border-radius:6px;border:1px solid rgba(245,242,236,.12);font-size:var(--font-16);font-family:var(--sans,Helvetica Neue,sans-serif)"><option value="">Status</option><option value="alive"' + (item.status === 'alive' ? ' selected' : '') + '>Alive</option><option value="dead"' + (item.status === 'dead' ? ' selected' : '') + '>Dead</option><option value="dormant"' + (item.status === 'dormant' ? ' selected' : '') + '>Dormant</option></select><input id="au_' + i + '_cost" value="' + esc(item.cost) + '" placeholder="Cost" onchange="saveAudit()" style="width:80px;padding:8px;border:1px solid rgba(245,242,236,.12);border-radius:6px;font-size:var(--font-16);font-family:var(--sans,Helvetica Neue,sans-serif)"/><button onclick="removeAudit(' + i + ')" style="background:none;border:none;cursor:pointer;color:rgba(245,242,236,.15)">\xd7</button></div>'
        }).join('') + btn('+ Add', 'addAudit()', 'bs') + doneBtn('saveSection14()', !(au.length > 0 && au.some(function(a) {
            return a.name
        }))))
    }
    if (sec === '1.5') {
        var qs = [{
            key: 'q1',
            l: 'Approve experiments *',
            ph: 'e.g. CEO'
        }, {
            key: 'q2',
            l: 'Advance projects',
            ph: 'e.g. VP Ops'
        }, {
            key: 'q3',
            l: 'Reallocate budget',
            ph: 'e.g. CFO'
        }, {
            key: 'q4',
            l: 'Kill projects *',
            ph: 'e.g. Nobody'
        }, {
            key: 'q5',
            l: 'Cross-functional resources',
            ph: 'e.g. Informal'
        }];
        h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">1.5 Decision Rights</h3><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Structural precondition for everything.</p>' + qs.map(function(q) {
            return '<div style="margin-bottom:16px"><label style="display:block;font-size:var(--font-16);;font-weight:600;margin-bottom:4px">' + q.l + '</label><input id="de_' + q.key + '_who" value="' + esc((de[q.key] || {}).who) + '" placeholder="' + q.ph + '" onchange="saveDecision(\'' + q.key + '\')" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(245,242,236,.12);font-size:16px;font-family:var(--sans,Helvetica Neue,sans-serif);margin-bottom:4px;box-sizing:border-box"/><input id="de_' + q.key + '_gap" value="' + esc((de[q.key] || {}).gap) + '" placeholder="Gaps..." onchange="saveDecision(\'' + q.key + '\')" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(245,242,236,.12);font-size:var(--font-16);font-family:var(--sans,Helvetica Neue,sans-serif);box-sizing:border-box"/></div>'
        }).join('') + doneBtn('saveSection15()', !((de.q1 || {}).who && (de.q4 || {}).who), (allC ? '\u2713 Battery Complete' : '\u2713 Complete \u2192')) + (allC ? card('<p style="font-size:16px;color:#1B6B5A;font-weight:700">\u2713 Assessment Report available under Outcomes.</p>', 'margin-top:20px;border:2px solid #1B6B5A;background:rgba(27,107,90,.06)') : ''))
    }
    if (allC) h += vizRadar();
    return h
}

// Save helpers for step 1.1
function savePurposeFields() {
    ['mission', 'values', 'shortTerm', 'mediumTerm', 'longTerm', 'goals', 'frictions'].forEach(function(f) {
        var v = val('p_' + f);
        if (v !== undefined) {
            if (!data.purpose) data.purpose = {};
            data.purpose[f] = v
        }
    });
    saveData()
}

function saveSection11() {
    savePurposeFields();
    if (!data.completedSections) data.completedSections = {};
    data.completedSections['1.1'] = true;
    UI.sec = '1.2';
    saveData();
    render()
}

function saveSection12() {
    if (!data.knowledge) data.knowledge = {};
    data.knowledge.usage = val('k_usage');
    data.knowledge.resources = val('k_resources');
    data.knowledge.learning = val('k_learning');
    if (!data.completedSections) data.completedSections = {};
    data.completedSections['1.2'] = true;
    UI.sec = '1.3';
    saveData();
    render()
}

function saveSection13() {
    if (!data.completedSections) data.completedSections = {};
    data.completedSections['1.3'] = true;
    UI.sec = '1.4';
    saveData();
    render()
}

function saveAudit() {
    var au = data.audit || [];
    for (var i = 0; i < au.length; i++) {
        au[i].name = val('au_' + i + '_name');
        au[i].status = val('au_' + i + '_status');
        au[i].cost = val('au_' + i + '_cost')
    }
    data.audit = au;
    saveData()
}

function addAudit() {
    if (!data.audit) data.audit = [];
    data.audit.push({
        name: '',
        status: '',
        cost: ''
    });
    saveData();
    render()
}

function removeAudit(i) {
    data.audit = (data.audit || []).filter(function(_, j) {
        return j !== i
    });
    saveData();
    render()
}

function saveSection14() {
    saveAudit();
    if (!data.completedSections) data.completedSections = {};
    data.completedSections['1.4'] = true;
    UI.sec = '1.5';
    saveData();
    render()
}

function saveDecision(key) {
    if (!data.decisions) data.decisions = {};
    if (!data.decisions[key]) data.decisions[key] = {};
    data.decisions[key].who = val('de_' + key + '_who');
    data.decisions[key].gap = val('de_' + key + '_gap');
    saveData()
}

function saveSection15() {
    saveDecision('q1');
    saveDecision('q2');
    saveDecision('q3');
    saveDecision('q4');
    saveDecision('q5');
    if (!data.completedSections) data.completedSections = {};
    data.completedSections['1.5'] = true;
    saveData();
    render()
}

// Step 1.2 Brainstorm
function renderStep12() {
    var ideas = data.ideas || [];
    var h = vp('V-1.2.1', 'Brainstorming AI Use Cases', '3\u20135 min');
    h += ctxPanel('1.2');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 2: Brainstorm</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Could AI address your friction points? Aim for 10\u201320 ideas.</p>';
    h += '<div style="margin:16px 0"><button onclick="UI.showEx.aurora=!UI.showEx.aurora;render()" style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;border:1px dashed rgba(27,107,90,.5);background:' + (UI.showEx.aurora ? 'rgba(27,107,90,.06)' : 'transparent') + ';cursor:pointer;font-size:var(--font-16);;font-weight:600;color:#1B6B5A;font-family:var(--sans,Helvetica Neue,sans-serif)">' + (UI.showEx.aurora ? '\u25be' : '\u25b8') + ' Aurora Example</button>' + (UI.showEx.aurora ? '<div style="margin-top:12px;padding:16px;background:rgba(27,107,90,.04);border-radius:8px;border:1px solid rgba(27,107,90,.2);font-size:var(--font-16);;color:#e0dbd5;line-height:1.6"><strong>Aurora:</strong>' + [{
        n: 'AI-Powered Quoting Engine',
        d: 'Automate quoting using specs, costs, and historical data.',
        s: 'Friction #1 \u2014 slow quoting',
        c: 'Medium ($15-60K)',
        w: 'now'
    }, {
        n: 'Computer Vision QC',
        d: 'CV models for defect detection on production line.',
        s: 'Friction #2 \u2014 inconsistent QC',
        c: 'High ($60K+)',
        w: 'future'
    }, {
        n: 'Innovation Idea Portal',
        d: 'Platform for employees to submit improvement ideas.',
        s: 'Friction #3 \u2014 no idea capture',
        c: 'Low ($0-15K)',
        w: 'now'
    }].map(function(idea) {
        return '<details style="margin-top:8px;padding:10px;background:rgba(245,242,236,.03);border-radius:6px;cursor:pointer"><summary style="font-weight:700;font-size:var(--font-16);">' + idea.n + ' ' + badge(idea.w, idea.w === 'now' ? '#1B6B5A' : '#2D5A8E') + '</summary><div style="margin-top:8px;font-size:var(--font-16)">' + idea.d + '<br/><em>Strategic:</em> ' + idea.s + ' \xb7 <em>Cost:</em> ' + idea.c + '</div></details>'
    }).join('') + '</div>' : '') + '</div>';

    if (UI.sf) {
        h += renderIdeaForm();
        return h
    }
    // Idea grid
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:16px">';
    ideas.forEach(function(idea, i) {
        h += card('<div onclick="UI.ec=' + i + ';UI.sf=true;render()" style="cursor:pointer"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea.name || 'Untitled') + '</h4>' + badge(idea.when === 'now' ? 'Now' : 'Future', idea.when === 'now' ? '#1B6B5A' : '#2D5A8E') + '</div><p style="font-size:var(--font-16);color:#8A8278;margin:0">' + esc((idea.desc || '').slice(0, 100)) + '</p></div>', 'padding:16px')
    });
    h += '</div>';
    h += btn('+ New Idea', 'UI.ec=null;UI.sf=true;render()', 'bp');
    if (ideas.length > 0) h += '<span style="margin-left:12px;font-size:var(--font-16);;color:rgba(138,130,120,.7)">' + ideas.length + ' ideas</span>';
    h += vizIdeas();
    return h
}

function renderIdeaForm() {
    var ideas = data.ideas || [];
    var isEdit = UI.ec !== null;
    var c = isEdit ? ideas[UI.ec] : {
        name: '',
        desc: '',
        strategic: '',
        outcome: '',
        capabilities: '',
        cost: '',
        risk: '',
        timeframe: '',
        dept: '',
        when: 'now'
    };
    return card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">Use Case Idea Card</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px"><div>' + ta('Name', 'ic_name', c.name, 'e.g. AI Quoting Engine', 1) + ta('Description', 'ic_desc', c.desc, 'What would this do?', 3) + ta('Strategic need', 'ic_strategic', c.strategic, 'Which friction point?', 2) + ta('Outcome', 'ic_outcome', c.outcome, 'Best: ... Worst: ...', 3) + '</div><div>' + ta('Capabilities', 'ic_capabilities', c.capabilities, 'Skills/tech needed', 2) + sel('Cost', 'ic_cost', c.cost, [{
        v: '',
        l: '...'
    }, {
        v: 'Low ($0-15K)',
        l: 'Low'
    }, {
        v: 'Medium ($15-60K)',
        l: 'Medium'
    }, {
        v: 'High ($60K+)',
        l: 'High'
    }]) + ta('Risks', 'ic_risk', c.risk, 'What could go wrong?', 2) + sel('Timeframe', 'ic_timeframe', c.timeframe, [{
        v: '',
        l: '...'
    }, {
        v: '1-3 months',
        l: '1-3mo'
    }, {
        v: '3-6 months',
        l: '3-6mo'
    }, {
        v: '6-12 months',
        l: '6-12mo'
    }, {
        v: '12+ months',
        l: '12+mo'
    }]) + '<div style="display:flex;gap:12px">' + ta('Dept', 'ic_dept', c.dept, '', 1) + sel('When', 'ic_when', c.when, [{
        v: 'now',
        l: 'Now'
    }, {
        v: 'future',
        l: 'Future'
    }]) + '</div></div></div><div style="display:flex;gap:12px;margin-top:12px">' + btn('Save', 'saveIdeaCard()', 'bp', '', false) + btn('Cancel', 'UI.sf=false;UI.ec=null;render()', 'bg2') + '</div>')
}

function saveIdeaCard() {
    var c = {
        name: val('ic_name'),
        desc: val('ic_desc'),
        strategic: val('ic_strategic'),
        outcome: val('ic_outcome'),
        capabilities: val('ic_capabilities'),
        cost: val('ic_cost'),
        risk: val('ic_risk'),
        timeframe: val('ic_timeframe'),
        dept: val('ic_dept'),
        when: val('ic_when') || 'now'
    };
    if (!c.name) return;
    if (!data.ideas) data.ideas = [];
    if (UI.ec !== null) {
        data.ideas[UI.ec] = c
    } else {
        data.ideas.push(c)
    }
    UI.sf = false;
    UI.ec = null;
    saveData();
    render()
}

// Step 1.3 Filter & Rank
function renderStep13() {
    var ideas = data.ideas || [],
        as = data.assessments || {};
    if (!ideas.length) return '<h2 style="font-size:22px;font-weight:500;margin:0 0 4px">Step 3: Filter & Rank</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Create ideas first.</p></div>');
    var h = vp('V-1.3.1', 'Filter & Rank Use Cases', '3\u20135 min');
    h += ctxPanel('1.3');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 3: Filter & Rank</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">FIRST assessment. Select up to 5 to advance.</p>';

    ideas.forEach(function(idea, i) {
        var a = as[i] || {};
        var allG = a.techCapable !== undefined && a.resourcesAvailable !== undefined && a.culturalFit !== undefined && a.purposeAligned !== undefined && a.affordable !== undefined;
        var feasible = a.techCapable && a.resourcesAvailable && a.culturalFit && a.purposeAligned && a.affordable;
        var anyNo = allG && !feasible;
        var score = feasible ? getScore(i) : 0;
        var isSel = (data.selected || []).indexOf(i) >= 0;

        h += card('<div style="display:flex;justify-content:space-between;margin-bottom:8px"><div><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea.name) + '</h4><span style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.7)">' + esc(idea.dept) + ' \xb7 ' + esc(idea.cost) + '</span></div>' + (anyNo ? badge('Disqualified', '#9B2D3F') : '') + (feasible ? badge(score + '/50', '#1B6B5A') : '') + '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + [{
                k: 'techCapable',
                l: 'Tech?'
            }, {
                k: 'resourcesAvailable',
                l: 'Resources?'
            }, {
                k: 'culturalFit',
                l: 'Culture?'
            }, {
                k: 'purposeAligned',
                l: 'Purpose?'
            }, {
                k: 'affordable',
                l: 'Affordable?'
            }].map(function(g) {
                var v = a[g.k];
                return '<button onclick="toggleGate(' + i + ',\'' + g.k + '\')" class="gate-btn' + (v === true ? ' pass' : v === false ? ' fail' : '') + '">' + (v === true ? '\u2713' : v === false ? '\u2717' : '\u25cb') + ' ' + g.l + '</button>'
            }).join('') + '</div>' +
            (feasible ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">' + [{
                k: 'priority',
                l: 'Priority'
            }, {
                k: 'risk',
                l: 'Risk(10=low)'
            }, {
                k: 'value',
                l: 'Value'
            }, {
                k: 'costScore',
                l: 'Cost(10=low)'
            }, {
                k: 'difficulty',
                l: 'Ease(10=easy)'
            }].map(function(d) {
                return '<div><label style="font-size:var(--font-control);color:#8A8278">' + d.l + '</label><input type="number" min="0" max="10" id="score_' + i + '_' + d.k + '" value="' + (a[d.k] || '') + '" onchange="saveScore(' + i + ',\'' + d.k + '\')" style="width:55px;padding:6px;border-radius:4px;border:1px solid rgba(245,242,236,.12);font-size:var(--font-16);;font-family:var(--sans,Helvetica Neue,sans-serif)"/></div>'
            }).join('') + '</div>' : '') +
            (feasible ? '<button onclick="toggleSelect(' + i + ')" style="padding:4px 14px;border-radius:6px;font-size:var(--font-16);font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (isSel ? '1px solid #1B6B5A' : '1px solid rgba(245,242,236,.12)') + ';background:' + (isSel ? '#1B6B5A' : 'rgba(245,242,236,.03)') + ';color:' + (isSel ? '#fff' : '#8A8278') + '">' + (isSel ? '\u2713 Selected' : 'Select') + '</button>' : ''),
            (isSel ? 'border:2px solid #1B6B5A;background:rgba(27,107,90,.04)' : anyNo ? 'border:1px solid #e8c4c4;background:rgba(155,45,63,.06)' : ''))
    });

    h += vizScores();
    if ((data.selected || []).length > 0) {
        h += card('<div style="display:flex;justify-content:space-between;align-items:center"><div><p style="font-size:16px;font-weight:700;color:#1B6B5A;margin:0">\u2713 ' + (data.selected || []).length + ' use case' + (((data.selected || []).length !== 1) ? 's' : '') + ' selected</p><p style="font-size:var(--font-16);;color:#d4cfca;margin:6px 0 0">Next step: run Deep Assessment to advance them.</p></div>' + btn('? Deep Assessment \u2192', 'go(\'2.4\')', 'bp', 'font-size:var(--font-16);;white-space:nowrap') + '</div>', 'border:2px solid #1B6B5A;background:rgba(27,107,90,.06)')
    }
    return h
}

function toggleGate(i, key) {
    if (!data.assessments) data.assessments = {};
    if (!data.assessments[i]) data.assessments[i] = {};
    var cur = data.assessments[i][key];
    data.assessments[i][key] = cur === true ? false : cur === false ? undefined : true;
    saveData();
    render()
}

function saveScore(i, key) {
    if (!data.assessments) data.assessments = {};
    if (!data.assessments[i]) data.assessments[i] = {};
    data.assessments[i][key] = parseInt(val('score_' + i + '_' + key)) || 0;
    saveData()
}

function toggleSelect(i) {
    if (!data.selected) data.selected = [];
    var idx = data.selected.indexOf(i);
    if (idx >= 0) data.selected.splice(idx, 1);
    else if (data.selected.length < 5) data.selected.push(i);
    saveData();
    render()
}
// === PHASE 2 STEPS ===
function renderStep21() {
    var ow = data.ownership || {};
    var leads = ow.leads || [];
    var h = vp('V-2.1.1', 'Pipeline Ownership', '3\u20135 min') + ctxPanel('2.1');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 1: Ownership & Structure</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Appoint an owner with real authority.</p>';
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Pipeline Owner</h3>' + ta('Name *', 'ow_ownerName', ow.ownerName, 'e.g. Maria Torres', 1) + ta('Role *', 'ow_ownerRole', ow.ownerRole, 'e.g. CEO', 1) + ta('Authority', 'ow_authority', ow.authority, 'e.g. Approve/kill, reallocate budget', 2), 'margin-bottom:16px');
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Embedded Leads</h3>' + leads.map(function(l, i) {
        return '<div style="display:flex;gap:8px;margin-bottom:8px"><input id="lead_' + i + '_name" value="' + esc(l.name) + '" placeholder="Name" onchange="saveLeads()" style="flex:1;padding:8px;border:1px solid rgba(245,242,236,.12);border-radius:6px;font-size:var(--font-16);;font-family:var(--sans,Helvetica Neue,sans-serif)"/><input id="lead_' + i + '_dept" value="' + esc(l.dept) + '" placeholder="Dept" onchange="saveLeads()" style="flex:1;padding:8px;border:1px solid rgba(245,242,236,.12);border-radius:6px;font-size:var(--font-16);;font-family:var(--sans,Helvetica Neue,sans-serif)"/><button onclick="removeLead(' + i + ')" style="background:none;border:none;cursor:pointer;color:rgba(245,242,236,.15)">\xd7</button></div>'
    }).join('') + btn('+ Add', 'addLead()', 'bs'));
    h += vizOwnership();
    h += doneBtn('saveDone21()', !(ow.ownerName && ow.ownerRole));
    return h
}

function saveOw() {
    ['ownerName', 'ownerRole', 'authority'].forEach(function(f) {
        updObj('ownership', f, val('ow_' + f))
    })
}

function saveLeads() {
    var leads = data.ownership ? data.ownership.leads || [] : [];
    for (var i = 0; i < leads.length; i++) {
        leads[i].name = val('lead_' + i + '_name');
        leads[i].dept = val('lead_' + i + '_dept')
    }
    if (!data.ownership) data.ownership = {};
    data.ownership.leads = leads;
    saveData()
}

function addLead() {
    if (!data.ownership) data.ownership = {};
    if (!data.ownership.leads) data.ownership.leads = [];
    data.ownership.leads.push({
        name: '',
        dept: ''
    });
    saveData();
    render()
}

function removeLead(i) {
    data.ownership.leads = data.ownership.leads.filter(function(_, j) {
        return j !== i
    });
    saveData();
    render()
}

function saveDone21() {
    saveOw();
    saveLeads();
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['2.1'] = true;
    saveData();
    render()
}

function renderStep22() {
    var inc = data.incentives || {};
    var h = vp('V-2.2.1', 'Incentive Realignment', '3\u20135 min') + ctxPanel('2.2');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 2: Realign Incentives</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Change what gets rewarded.</p>';
    h += ta('Current structure *', 'inc_current', inc.current, 'e.g. Measured on delivery KPIs only', 3);
    h += ta('Proposed changes *', 'inc_changes', inc.changes, 'e.g. Add pipeline health metrics', 3);
    h += '<div style="margin-bottom:16px"><label style="display:block;font-size:var(--font-16);;font-weight:600;margin-bottom:8px">Metrics to track</label>';
    ['Active experiments', 'Kill speed', 'Stage-gate throughput', 'Support for experimentation', 'Frontline ideas'].forEach(function(m) {
        var checked = (inc.metrics || []).indexOf(m) >= 0;
        h += '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:var(--font-16);;cursor:pointer"><input type="checkbox"' + (checked ? ' checked' : '') + ' onchange="toggleIncMetric(\'' + esc(m) + '\')" />' + m + '</label>'
    });
    h += '</div>' + doneBtn('saveDone22()', !(inc.current && inc.changes));
    return h
}

function toggleIncMetric(m) {
    if (!data.incentives) data.incentives = {};
    var arr = data.incentives.metrics || [];
    var idx = arr.indexOf(m);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(m);
    data.incentives.metrics = arr;
    saveData();
    render()
}

function saveDone22() {
    updObj('incentives', 'current', val('inc_current'));
    updObj('incentives', 'changes', val('inc_changes'));
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['2.2'] = true;
    saveData();
    render()
}

function renderStep23() {
    var rh = data.rhythm || {};
    var h = vp('V-2.3.1', 'Innovation Rhythm', '2\u20133 min') + ctxPanel('2.3');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 3: Innovation Rhythm</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Protected weekly space for the future.</p>';
    h += '<div style="display:flex;gap:12px;flex-wrap:wrap">' + sel('Day *', 'rh_day', rh.day, [{
        v: '',
        l: '...'
    }, {
        v: 'Mon',
        l: 'Mon'
    }, {
        v: 'Tue',
        l: 'Tue'
    }, {
        v: 'Wed',
        l: 'Wed'
    }, {
        v: 'Thu',
        l: 'Thu'
    }, {
        v: 'Fri',
        l: 'Fri'
    }]) + ta('Time', 'rh_time', rh.time, '9 AM', 1) + '</div>';
    h += ta('Attendees *', 'rh_attendees', rh.attendees, 'e.g. CEO, CFO, Dept Heads', 2);
    h += ta('Agenda', 'rh_agenda', rh.agenda, 'e.g. 1. Status (5min) 2. Opportunities (10min)...', 4);
    h += doneBtn('saveDone23()', !(rh.day && rh.attendees));
    return h
}

function saveDone23() {
    ['day', 'time', 'attendees', 'agenda'].forEach(function(f) {
        updObj('rhythm', f, val('rh_' + f))
    });
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['2.3'] = true;
    saveData();
    render()
}

function renderStep24() {
    var ideas = data.ideas || [],
        sel = data.selected || [],
        proj = data.projects || {},
        as = data.assessments || {};
    if (!sel.length) return '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 4: Deepen</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Complete Phase 1 first.</p></div>');
    var ap = UI.ap !== null && sel.indexOf(UI.ap) >= 0 ? UI.ap : sel[0];
    UI.ap = ap;
    var p = proj[ap] || {};
    var idea = ideas[ap] || {};
    var allDone = sel.every(function(i) {
        return (proj[i] || {}).viable !== undefined && (proj[i] || {}).objectives
    });
    var h = vp('V-2.4.1', 'From Ideas to Project Cards', '3\u20135 min') + ctxPanel('2.4');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 4: Deepen Assessment</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Project Card + Gap + SWOT + Partnerships \u2192 Go/No Go.</p>';

    // Project tabs
    h += '<div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">';
    sel.forEach(function(i) {
        var pr = proj[i] || {};
        h += '<button onclick="UI.ap=' + i + ';render()" style="padding:8px 14px;border-radius:8px;font-size:var(--font-16);font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (ap === i ? '2px solid #2D5A8E' : '1px solid rgba(245,242,236,.12)') + ';background:' + (pr.viable === true ? 'rgba(45,90,142,.06)' : pr.viable === false ? 'rgba(155,45,63,.06)' : 'rgba(245,242,236,.03)') + ';color:' + (ap === i ? '#2D5A8E' : '#8A8278') + '">' + esc(ideas[i] ? ideas[i].name : '') + (pr.viable === true ? ' \u2713' : pr.viable === false ? ' \u2717' : '') + '</button>'
    });
    h += '</div>';

    // Project card
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Project: ' + esc(idea.name) + '</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        ta('Objectives *', 'pj_objectives', p.objectives, 'Project objectives', 2) + ta('Deliverables', 'pj_deliverables', p.deliverables, '', 2) + ta('Timeline', 'pj_timeline', p.timeline, '', 2) + ta('Resources', 'pj_resources', p.resources, '', 2) + ta('Risks', 'pj_risks', p.risks || idea.risk, '', 2) + ta('Success metrics', 'pj_metrics', p.metrics, '', 2) + '</div>', 'margin-bottom:12px');

    // SWOT
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">SWOT</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;border-radius:8px;overflow:hidden">' + [{
        k: 'strengths',
        l: '+ Strengths',
        bg: 'rgba(27,107,90,.08)'
    }, {
        k: 'weaknesses',
        l: '- Weaknesses',
        bg: 'rgba(155,45,63,.06)'
    }, {
        k: 'opportunities',
        l: '? Opportunities',
        bg: 'rgba(45,90,142,.08)'
    }, {
        k: 'threats',
        l: '? Threats',
        bg: 'rgba(139,94,60,.08)'
    }].map(function(q) {
        return '<div style="background:' + q.bg + ';padding:14px"><div style="font-size:var(--font-16);;font-weight:700;margin-bottom:6px">' + q.l + '</div><textarea id="sw_' + q.k + '" rows="3" onchange="saveSwot()" style="width:100%;padding:8px;border:1px solid rgba(245,242,236,.12);border-radius:6px;font-size:var(--font-16);font-family:var(--sans,Helvetica Neue,sans-serif);box-sizing:border-box;background:rgba(245,242,236,.06);color:var(--paper)">' + esc((p.swot || {})[q.k]) + '</textarea></div>'
    }).join('') + '</div>', 'margin-bottom:12px');

    // Go/No Go
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Go / No Go</h3><div style="display:flex;gap:12px"><button onclick="setViable(true)" style="flex:1;padding:14px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (p.viable === true ? '2px solid #1B6B5A' : '1px solid rgba(245,242,236,.12)') + ';background:' + (p.viable === true ? '#1B6B5A' : 'rgba(245,242,236,.03)') + ';color:' + (p.viable === true ? '#fff' : 'var(--stone)') + '">\u2713 Go</button><button onclick="setViable(false)" style="flex:1;padding:14px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (p.viable === false ? '2px solid #9B2D3F' : '1px solid rgba(245,242,236,.12)') + ';background:' + (p.viable === false ? '#9B2D3F' : 'rgba(245,242,236,.03)') + ';color:' + (p.viable === false ? '#fff' : 'var(--stone)') + '">\u2717 No Go</button></div>' + (p.viable === false ? ta('Reason', 'pj_noGoReason', p.noGoReason, '', 2) : ''), 'border-left:' + (p.viable === true ? '4px solid #1B6B5A' : p.viable === false ? '4px solid #9B2D3F' : '4px solid rgba(245,242,236,.12)'));

    h += vizProjectReady();
    if (allDone) h += doneBtn('saveDone24()', false, '\u2713 All Assessed');
    return h
}

function saveProjectFields() {
    var ap = UI.ap;
    if (ap === null) return;
    ['objectives', 'deliverables', 'timeline', 'resources', 'risks', 'metrics', 'noGoReason'].forEach(function(f) {
        var v = val('pj_' + f);
        if (v !== undefined) updNested('projects', ap, f, v)
    })
}

function saveSwot() {
    var ap = UI.ap;
    if (ap === null) return;
    var sw = {};
    ['strengths', 'weaknesses', 'opportunities', 'threats'].forEach(function(k) {
        sw[k] = val('sw_' + k)
    });
    updNested('projects', ap, 'swot', sw)
}

function setViable(v) {
    saveProjectFields();
    saveSwot();
    updNested('projects', UI.ap, 'viable', v);
    render()
}

function saveDone24() {
    saveProjectFields();
    saveSwot();
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['2.4'] = true;
    saveData();
    render()
}
// === PHASE 3 STEPS ===
function renderStep31() {
    var ideas = data.ideas || [],
        as = data.assessments || {},
        proj = data.projects || {},
        stages = getStages(),
        goP = stages.explore,
        port = data.portfolio || {};
    if (!goP.length) {
        var msg31 = (data.selected && data.selected.length > 0) ? 'Mark at least one project as Go in Step 2.4 (Deepen Assessment) to proceed.' : 'Complete Phase 2 first — filter ideas and deepen assessments.';
        return '<h2 style="font-size:22px;font-weight:700">Step 1: Structure Portfolio</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">' + msg31 + '</p></div>')
    }
    var allScored = goP.every(function(i) {
        return (port[i] || {}).horizon
    });
    var h = vp('V-3.1.1', 'Portfolio Thinking vs. Project Lists', '3\u20135 min') + ctxPanel('3.1');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 1: Structure as Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Treat initiatives as an interconnected investment portfolio. Score, classify by time horizon, and assess balance.</p>';
    goP.forEach(function(i) {
        var idea = ideas[i],
            p = port[i] || {},
            score = getScore(i);
        h += card('<div style="display:flex;justify-content:space-between;margin-bottom:8px"><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + badge(score + '/50', '#1B6B5A') + '</div>' + sel('Time horizon *', 'port_' + i + '_h', p.horizon, [{
            v: '',
            l: 'Select...'
        }, {
            v: 'quick',
            l: 'Quick win (weeks)'
        }, {
            v: 'medium',
            l: 'Medium-term (months)'
        }, {
            v: 'long',
            l: 'Long-term bet (6+ months)'
        }]) + likert('Strategic alignment', 'portfolio.' + i + '.alignment', p.alignment, 'Low', 'High') + ta('Notes', 'port_' + i + '_n', p.notes, 'e.g. Balances the long-term QC project with a quick win', 2), 'margin-bottom:12px')
    });
    if (allScored) {
        h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Portfolio Balance</h3><div style="display:flex;gap:16px">' + ['quick', 'medium', 'long'].map(function(hh) {
            var cnt = goP.filter(function(i) {
                return (port[i] || {}).horizon === hh
            }).length;
            return '<div style="flex:1;text-align:center;padding:16px;background:rgba(245,242,236,.03);border-radius:8px"><div style="font-size:24px;font-weight:600;color:#8B5E3C">' + cnt + '</div><div style="font-size:var(--font-16);color:rgba(138,130,120,.7)">' + (hh === 'quick' ? 'Quick Wins' : hh === 'medium' ? 'Medium-Term' : 'Long-Term') + '</div></div>'
        }).join('') + '</div>', 'margin-bottom:12px;background:#f5f5f0');
        h += vizHorizon();
        h += doneBtn('saveDone31()', false, '\u2713 Portfolio Structured')
    }
    return h
}

function saveDone31() {
    var goP = getStages().explore;
    goP.forEach(function(i) {
        updNested('portfolio', i, 'horizon', val('port_' + i + '_h'));
        updNested('portfolio', i, 'notes', val('port_' + i + '_n'))
    });
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['3.1'] = true;
    saveData();
    render()
}

function renderStep32() {
    var cap = data.capital || {},
        ideas = data.ideas || [],
        stages = getStages(),
        goP = stages.explore,
        port = data.portfolio || {},
        ca = data.capAlloc || {};
    var h = vp('V-3.2.1', 'Purpose-Driven Capital Allocation', '3\u20135 min') + ctxPanel('3.2');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 2: Allocate Capital</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Start from what you need, not what you have. Stage-gate discipline.</p>';
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Overall Budget</h3>' + ta('Total investment required *', 'cap_required', cap.required, 'e.g. $150,000 for full portfolio', 1) + ta('Currently budgeted', 'cap_budgeted', cap.budgeted, 'e.g. $80,000', 1) + ta('Reallocation sources', 'cap_reallocation', cap.reallocation, 'e.g. $25,000 from dormant ERP project', 2) + ta('Funding gap & plan', 'cap_gapPlan', cap.gapPlan, 'e.g. Request $45,000 additional', 2), 'margin-bottom:16px');
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Per-Project Allocation</h3>' + goP.map(function(i) {
        var idea = ideas[i],
            c = ca[i] || {};
        return '<div style="padding:16px;border:1px solid rgba(245,242,236,.08);border-radius:8px;margin-bottom:12px;background:rgba(245,242,236,.02)"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + badge((port[i] || {}).horizon || '\u2014', '#8B5E3C') + '</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + ta('Budget', 'ca_' + i + '_budget', c.budget, 'e.g. $40,000', 1) + ta('First milestone', 'ca_' + i + '_milestone', c.milestone, 'e.g. Working prototype by week 6', 1) + '</div>' + ta('Stage-gate criteria', 'ca_' + i + '_gates', c.gates, 'e.g. Gate 1: Prototype complete \u2192 release $15K', 2) + '</div>'
    }).join(''));
    h += doneBtn('saveDone32()', !cap.required);
    return h
}

function saveDone32() {
    ['required', 'budgeted', 'reallocation', 'gapPlan'].forEach(function(f) {
        updObj('capital', f, val('cap_' + f))
    });
    var goP = getStages().explore;
    goP.forEach(function(i) {
        ['budget', 'milestone', 'gates'].forEach(function(f) {
            updNested('capAlloc', i, f, val('ca_' + i + '_' + f))
        })
    });
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['3.2'] = true;
    saveData();
    render()
}

function renderStep33() {
    var ideas = data.ideas || [],
        stages = getStages(),
        goP = stages.explore,
        as = data.assessments || {},
        port = data.portfolio || {},
        exp = data.experiments || {},
        exSel = data.expSelected || [];
    var quickWins = goP.filter(function(i) {
        return (port[i] || {}).horizon === 'quick'
    }).sort(function(a, b) {
        return getScore(b) - getScore(a)
    });
    var allDesigned = exSel.length > 0 && exSel.every(function(i) {
        return (exp[i] || {}).owner && (exp[i] || {}).successMetric
    });
    var h = vp('V-3.3.1', 'Designing Experiments as Learning Journeys', '3\u20135 min') + ctxPanel('3.3');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 3: Design Experiments</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Select 3\u20135 quick wins and design each. Every experiment needs an owner, budget, timeline, success metric, and evaluation milestone.</p>';
    // Quick wins selection
    if (quickWins.length > 0) {
        h += '<h3 style="font-size:16px;font-weight:700;color:#8B5E3C;margin-bottom:12px">Quick Wins Available (' + quickWins.length + ')</h3>';
        quickWins.forEach(function(i) {
            h += '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(245,242,236,.06)"><button onclick="toggleExpSel(' + i + ')" style="padding:4px 12px;border-radius:6px;font-size:var(--font-16);font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (exSel.indexOf(i) >= 0 ? '1px solid #8B5E3C' : '1px solid rgba(245,242,236,.12)') + ';background:' + (exSel.indexOf(i) >= 0 ? '#8B5E3C' : 'rgba(245,242,236,.03)') + ';color:' + (exSel.indexOf(i) >= 0 ? '#fff' : 'var(--stone)') + '">' + (exSel.indexOf(i) >= 0 ? '\u2713' : '\u25cb') + '</button><span style="font-size:16px;font-weight:600">' + esc(ideas[i] ? ideas[i].name : '') + '</span>' + badge(getScore(i) + '/50', '#1B6B5A') + '</div>'
        })
    }
    // Other projects
    var others = goP.filter(function(i) {
        return quickWins.indexOf(i) < 0
    });
    if (others.length > 0) {
        h += '<div style="margin-top:16px"><h3 style="font-size:16px;font-weight:700;color:#8A8278;margin-bottom:8px">Other Projects</h3>';
        others.forEach(function(i) {
            h += '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(245,242,236,.06)"><button onclick="toggleExpSel(' + i + ')" style="padding:4px 12px;border-radius:6px;font-size:var(--font-16);font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (exSel.indexOf(i) >= 0 ? '1px solid #8B5E3C' : '1px solid rgba(245,242,236,.12)') + ';background:' + (exSel.indexOf(i) >= 0 ? '#8B5E3C' : 'rgba(245,242,236,.03)') + ';color:' + (exSel.indexOf(i) >= 0 ? '#fff' : 'var(--stone)') + '">' + (exSel.indexOf(i) >= 0 ? '\u2713' : '\u25cb') + '</button><span style="font-size:16px">' + esc(ideas[i] ? ideas[i].name : '') + '</span>' + badge((port[i] || {}).horizon || '\u2014', '#2D5A8E') + '</div>'
        });
        h += '</div>'
    }
    // Experiment briefs
    if (exSel.length > 0) {
        h += '<div style="margin-top:24px"><h3 style="font-size:16px;font-weight:700;color:#8B5E3C;margin-bottom:16px">Experiment Design Briefs</h3>';
        exSel.forEach(function(i) {
            var e = exp[i] || {},
                idea = ideas[i];
            h += card('<h4 style="font-size:15px;font-weight:700;margin:0 0 12px">' + esc(idea ? idea.name : '') + '</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + ta('Owner *', 'exp_' + i + '_owner', e.owner, 'e.g. Sarah Kim', 1) + ta('Budget', 'exp_' + i + '_budget', e.budget, 'e.g. $15,000', 1) + ta('Timeline', 'exp_' + i + '_timeline', e.timeline, 'e.g. 4 weeks', 1) + ta('Success metric *', 'exp_' + i + '_successMetric', e.successMetric, 'e.g. Quote turnaround < 4 hours', 1) + '</div>' + ta('What you\'re testing', 'exp_' + i + '_testing', e.testing, 'e.g. Technology feasibility, user adoption', 2) + ta('Evaluation milestone', 'exp_' + i + '_milestone', e.milestone, 'e.g. Week 2: initial check. Week 4: full evaluation.', 2) + btn('\\u2714 Save & Update', 'saveExpCard(' + i + ')', 'bs', 'font-size:var(--font-16);margin-top:8px'), 'border-left:4px solid #8B5E3C;margin-bottom:16px')
        });
        h += '</div>'
    }
    h += vizExpReady();
    if (allDesigned) h += doneBtn('saveDone33()', false, '\u2713 Experiments Designed \u2014 Ready for Phase 4');
    return h
}

function toggleExpSel(i) {
    if (!data.expSelected) data.expSelected = [];
    var idx = data.expSelected.indexOf(i);
    if (idx >= 0) data.expSelected.splice(idx, 1);
    else if (data.expSelected.length < 5) data.expSelected.push(i);
    saveData();
    render()
}

function saveExpCard(idx) {
    var fields = ['owner', 'budget', 'timeline', 'successMetric', 'testing', 'milestone'];
    fields.forEach(function(f) {
        updNested('experiments', idx, f, val('exp_' + idx + '_' + f))
    });
    saveData();
    render()
}

function saveDone33() {
    var exSel = data.expSelected || [];
    exSel.forEach(function(i) {
        ['owner', 'budget', 'timeline', 'successMetric', 'testing', 'milestone'].forEach(function(f) {
            updNested('experiments', i, f, val('exp_' + i + '_' + f))
        })
    });
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['3.3'] = true;
    saveData();
    render()
}

// === PHASE 4 STEPS ===
function renderStep41() {
    var ideas = data.ideas || [],
        exSel = data.expSelected || [],
        exp = data.experiments || {},
        trk = data.tracking || {};
    if (!exSel.length) return '<h2 style="font-size:22px;font-weight:700">Step 1: Launch Experiments</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Design experiments in Phase 3 first.</p></div>');
    var allTracked = exSel.every(function(i) {
        return (trk[i] || {}).status
    });
    var h = vp('V-4.1.1', 'Launch: The Dual Purpose of Experiments', '3\u20135 min') + ctxPanel('4.1');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 1: Launch Experiments</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Execute your experiments. Track both results AND infrastructure learnings.</p>';
    exSel.forEach(function(i) {
        var idea = ideas[i],
            e = exp[i] || {},
            tr = trk[i] || {};
        h += card('<div style="display:flex;justify-content:space-between;margin-bottom:12px"><h4 style="font-size:15px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + sel('', 'trk_' + i + '_status', tr.status, [{
            v: '',
            l: 'Status...'
        }, {
            v: 'running',
            l: '? Running'
        }, {
            v: 'paused',
            l: '? Paused'
        }, {
            v: 'complete',
            l: '? Complete'
        }, {
            v: 'killed',
            l: 'Killed'
        }]) + '</div>' + ta('Results to date', 'trk_' + i + '_results', tr.results, 'e.g. Week 2: Prototype at 85% accuracy.', 3) + ta('Infrastructure learnings', 'trk_' + i + '_infraLearnings', tr.infraLearnings, 'e.g. Decision rights working but budget reallocation too slow.', 2) + ta('What\'s breaking / working', 'trk_' + i + '_breakWork', tr.breakWork, 'e.g. Working: ownership model. Breaking: cross-functional requests.', 2), 'border-left:4px solid #9B2D3F;margin-bottom:16px')
    });
    h += vizExpStatus();
    if (allTracked) h += doneBtn('saveDone41()', false, '\u2713 Experiments Tracked');
    return h
}

function saveDone41() {
    var exSel = data.expSelected || [];
    exSel.forEach(function(i) {
        ['status', 'results', 'infraLearnings', 'breakWork'].forEach(function(f) {
            updNested('tracking', i, f, val('trk_' + i + '_' + f))
        })
    });
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['4.1'] = true;
    saveData();
    render()
}

function renderStep42() {
    var gov = data.governance || {};
    var h = vp('V-4.2.1', 'Governance: Making Innovation Sustainable', '3\u20135 min') + ctxPanel('4.2');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 2: Establish Governance</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Lock in three mechanisms that sustain the pipeline beyond 90 days.</p>';
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">1. Standing Leadership Agenda</h3><p style="font-size:var(--font-16);;color:rgba(138,130,120,.7);margin:4px 0 12px">Pipeline health as a recurring item in leadership meetings.</p>' + ta('Meeting to embed in *', 'gov_meeting', gov.meeting, 'e.g. Weekly senior leadership meeting', 1) + ta('Metrics to review', 'gov_metrics', gov.metrics, 'e.g. Active experiments, pipeline throughput', 2) + ta('Format', 'gov_format', gov.format, 'e.g. 10-min standing item: dashboard review', 2), 'margin-bottom:16px');
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">2. Stage-Gate Discipline</h3><p style="font-size:var(--font-16);;color:rgba(138,130,120,.7);margin:4px 0 12px">Every investment requires a gate review. No exceptions.</p>' + ta('Investment threshold *', 'gov_threshold', gov.threshold, 'e.g. Any investment above $5,000', 1) + ta('Gate review process', 'gov_gateProcess', gov.gateProcess, 'e.g. Pipeline owner + dept lead review against milestones.', 3) + ta('Milestone check frequency', 'gov_milestoneFreq', gov.milestoneFreq, 'e.g. Every 4 weeks for active experiments', 1), 'margin-bottom:16px');
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">3. Quarterly Portfolio Review</h3><p style="font-size:var(--font-16);;color:rgba(138,130,120,.7);margin:4px 0 12px">Finance, operations, and technology at the same table.</p>' + ta('Review attendees *', 'gov_reviewAttendees', gov.reviewAttendees, 'e.g. CEO, CFO, CTO, Department Heads', 2) + ta('Review agenda', 'gov_reviewAgenda', gov.reviewAgenda, 'e.g. 1. Portfolio status (15min) 2. Buy/sell/hold decisions (30min)...', 4) + ta('First review date', 'gov_firstReview', gov.firstReview, 'e.g. End of Q2 2026', 1));
    h += doneBtn('saveDone42()', !(gov.meeting && gov.threshold && gov.reviewAttendees));
    return h
}

function saveDone42() {
    ['meeting', 'metrics', 'format', 'threshold', 'gateProcess', 'milestoneFreq', 'reviewAttendees', 'reviewAgenda', 'firstReview'].forEach(function(f) {
        updObj('governance', f, val('gov_' + f))
    });
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['4.2'] = true;
    saveData();
    render()
}

function renderStep43() {
    var stress = data.stress || {};
    var h = vp('V-4.3.1', 'Stress-Testing: What Needs Tuning?', '3\u20135 min') + ctxPanel('4.3');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 3: Stress-Test Org Design</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Review what the first 70+ days have taught you.</p>';
    [{
        k: 'decisions',
        l: 'Are decision rights working in practice?',
        ph: 'e.g. Mostly \u2014 but budget reallocation still stuck.'
    }, {
        k: 'ownership',
        l: 'Is the ownership model delivering?',
        ph: 'e.g. Central owner working well. One embedded lead overwhelmed.'
    }, {
        k: 'incentives',
        l: 'Are incentive changes shifting behavior?',
        ph: 'e.g. Early signs in sales. Manufacturing still on old metrics.'
    }, {
        k: 'culture',
        l: 'Is culture shifting or are old defaults reasserting?',
        ph: 'e.g. Weekly rhythm helping. Still seeing \'not my job.\' '
    }].forEach(function(q) {
        h += likert(q.l, 'stress.' + q.k + 'Score', stress[q.k + 'Score'], 'Not at all', 'Fully');
        h += ta('Details', 'str_' + q.k, stress[q.k], q.ph, 2)
    });
    h += '<div style="margin-bottom:16px"><label style="display:block;font-size:var(--font-16);;font-weight:600;color:#F5F2EC;margin-bottom:8px">What needs tuning? Top priorities for adjustment. *</label>';
    for (var n = 0; n < 5; n++) {
        h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:var(--font-16);;font-weight:700;color:#9B2D3F;min-width:20px">' + (n + 1) + '.</span><input id="tune_' + n + '" value="' + esc((stress.tuningList || [])[n]) + '" placeholder="' + (n === 0 ? 'e.g. Add mid-cycle budget reallocation' : n === 1 ? 'e.g. Split manufacturing embedded lead role' : '(optional)') + '" style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(245,242,236,.12);font-size:var(--font-16);;font-family:var(--sans,Helvetica Neue,sans-serif);box-sizing:border-box"/></div>'
    }
    h += '</div>' + doneBtn('saveDone43()', !((stress.tuningList || []).some(function(t) {
        return t
    })));
    return h
}

function saveDone43() {
    ['decisions', 'ownership', 'incentives', 'culture'].forEach(function(k) {
        updObj('stress', k, val('str_' + k))
    });
    var list = [];
    for (var n = 0; n < 5; n++) list.push(val('tune_' + n));
    updObj('stress', 'tuningList', list);
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['4.3'] = true;
    saveData();
    render()
}

function renderStep44() {
    var ideas = data.ideas || [],
        as = data.assessments || {},
        exSel = data.expSelected || [],
        trk = data.tracking || {},
        rev = data.review || {};
    var allItems = exSel.concat((data.selected || []).filter(function(i) {
        return exSel.indexOf(i) < 0 && (data.projects || {})[i] && (data.projects || {})[i].viable === true
    }));
    var allDecided = allItems.every(function(i) {
        return ((rev.items || {})[i] || {}).decision
    });
    var h = vp('V-4.4.1', 'First Portfolio Review', '3\u20135 min') + ctxPanel('4.4');
    h += '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Step 4: First Portfolio Review</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Buy, sell, or hold each initiative. Replenish and rebalance.</p>';
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Buy / Sell / Hold Analysis</h3>' + allItems.map(function(i) {
        var idea = ideas[i],
            tr = trk[i] || {},
            ri = (rev.items || {})[i] || {};
        return '<div style="padding:16px;border:1px solid rgba(245,242,236,.08);border-radius:8px;margin-bottom:12px;background:' + (ri.decision === 'buy' ? 'rgba(27,107,90,.06)' : ri.decision === 'sell' ? 'rgba(155,45,63,.06)' : 'rgba(245,242,236,.03)') + '"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + (tr.status ? badge(tr.status, tr.status === 'complete' ? '#1B6B5A' : tr.status === 'running' ? '#2D5A8E' : 'rgba(138,130,120,.5)') : '') + '</div>' + (tr.results ? '<p style="font-size:var(--font-16);color:#8A8278;margin-bottom:8px">' + esc(tr.results.slice(0, 150)) + '</p>' : '') + '<div style="display:flex;gap:8px">' + [{
            v: 'buy',
            l: 'Buy (Scale)',
            c: '#1B6B5A'
        }, {
            v: 'hold',
            l: 'Hold (Maintain)',
            c: '#8B5E3C'
        }, {
            v: 'sell',
            l: 'Sell (Kill)',
            c: '#9B2D3F'
        }].map(function(d) {
            return '<button onclick="setReviewDecision(' + i + ',\'' + d.v + '\')" style="flex:1;padding:10px 8px;border-radius:8px;font-size:var(--font-16);font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:' + (ri.decision === d.v ? '2px solid ' + d.c : '1px solid rgba(245,242,236,.12)') + ';background:' + (ri.decision === d.v ? d.c + '18' : 'rgba(245,242,236,.03)') + ';color:' + (ri.decision === d.v ? d.c : 'rgba(138,130,120,.7)') + '">' + d.l + '</button>'
        }).join('') + '</div>' + (ri.decision ? ta('Rationale', 'rev_' + i + '_rationale', ri.rationale, 'Why this decision?', 2) : '') + '</div>'
    }).join(''));
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Portfolio Replenishment</h3>' + ta('New opportunities', 'rev_newOpportunities', rev.newOpportunities, 'e.g. 1. AI-assisted inventory forecasting...', 3) + ta('Balance assessment', 'rev_balance', rev.balance, 'e.g. Heavy on quick wins, need more medium-term...', 2), 'margin-bottom:16px');
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Key Learnings</h3>' + ta('What worked?', 'rev_worked', rev.worked, '', 2) + ta('What didn\'t?', 'rev_didnt', rev.didnt, '', 2) + ta('Changes for next cycle?', 'rev_nextCycle', rev.nextCycle, '', 2));
    if (allDecided) h += doneBtn('saveDone44()', false, '\u2713 First Review Complete \u2014 The Engine is Running');
    if ((data.completedSteps || {})['4.4']) h += card('<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:22px">&#9679;</span><h3 style="font-size:18px;font-weight:700;color:#9B2D3F;margin:0">90-Day Ignition Complete</h3></div><p style="font-size:16px;color:#d4cfca;line-height:1.6">You have a functioning innovation pipeline. The 90 days were the ignition. The engine is now running.</p>', 'margin-top:24px;border:2px solid #9B2D3F;background:rgba(155,45,63,.06)');
    return h
}

function setReviewDecision(i, d) {
    if (!data.review) data.review = {};
    if (!data.review.items) data.review.items = {};
    if (!data.review.items[i]) data.review.items[i] = {};
    data.review.items[i].decision = d;
    saveData();
    render()
}

function saveDone44() {
    ['newOpportunities', 'balance', 'worked', 'didnt', 'nextCycle'].forEach(function(f) {
        updObj('review', f, val('rev_' + f))
    });
    var allItems = (data.expSelected || []).concat((data.selected || []).filter(function(i) {
        return (data.expSelected || []).indexOf(i) < 0 && (data.projects || {})[i] && (data.projects || {})[i].viable === true
    }));
    allItems.forEach(function(i) {
        updNested('review', 'items', i, {
            decision: ((data.review || {}).items || {})[i] ? ((data.review || {}).items || {})[i].decision : '',
            rationale: val('rev_' + i + '_rationale')
        })
    });
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps['4.4'] = true;
    saveData();
    render()
}
// === PHASE 5: NAVIGATE DASHBOARD ===
function renderNavDash() {
    var _w = '<div style="padding-top:110px"><div class="wrap" style="max-width:800px;padding:0 24px 80px">';
    var ideas = data.ideas || [],
        stages = getStages(),
        rh = data.rhythm || {},
        gov = data.governance || {},
        trk = data.tracking || {};
    var nm = {
        bluesky: 'out-bluesky',
        explore: 'out-explore',
        experiment: 'out-expbriefs',
        operate: 'out-oper'
    };
    var h = _w + '<div style="margin-bottom:24px">' + badge('Ongoing', '#6B4C8A') + '<h1 style="font-size:28px;font-weight:600;margin:8px 0 4px">Pipeline Dashboard</h1><p style="color:#8A8278;font-size:16px">Your operational pipeline. Click any stage to manage it.</p></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">';
    h += card('<div style="font-size:18px;font-weight:700;color:var(--paper);text-transform:uppercase;letter-spacing:1px;margin-bottom:15px">Next Innovation Session</div><div style="font-size:20px;font-weight:600;color:#6B4C8A">' + (rh.day || '\u2014') + ' at ' + (rh.time || 'TBD') + '</div><div style="font-size:var(--font-16);color:rgba(138,130,120,.7);margin-top:4px">' + (rh.duration || 30) + ' min \xb7 ' + (rh.attendees || 'TBD') + '</div>', 'background:rgba(107,76,138,.06);border:1px solid rgba(107,76,138,.3)');
    h += card('<div style="font-size:var(--font-readable-sm);font-weight:700;color:#9B2D3F;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Next Quarterly Review</div><div style="font-size:20px;font-weight:600;color:#9B2D3F">' + (gov.firstReview || 'TBD') + '</div><div style="margin-top:8px">' + btn('\u25b6 Run Quarterly Review', 'go(\'4.4\')', 'bp', 'font-size:var(--font-16);padding:6px 14px;background:#9B2D3F') + '</div>', 'background:rgba(155,45,63,.06);border:1px solid rgba(155,45,63,.3)');
    h += '</div>';
    h += pipeViz('', nm);
    // Stage cards
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">';
    [{
        k: 'bluesky',
        t: 'Blue Sky',
        c: '#1B6B5A',
        nav: 'out-bluesky',
        items: stages.bluesky
    }, {
        k: 'explore',
        t: 'Exploration',
        c: '#2D5A8E',
        nav: 'out-explore',
        items: stages.explore
    }, {
        k: 'experiment',
        t: 'Development',
        c: '#8B5E3C',
        nav: 'out-expbriefs',
        items: stages.experiment
    }, {
        k: 'operate',
        t: 'Operational',
        c: '#9B2D3F',
        nav: 'out-oper',
        items: stages.operational || []
    }].forEach(function(s) {
        h += card('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="font-size:15px;font-weight:700;color:' + s.c + ';margin:0">' + s.t + '</h3>' + badge(s.items.length + (s.k === 'operate' ? ' live' : ' items'), s.c) + '</div>' +
            s.items.slice(0, 3).map(function(i) {
                var idea = ideas[i];
                return '<div style="font-size:var(--font-16);color:#d4cfca;padding:4px 0;border-bottom:1px solid rgba(245,242,236,.06);display:flex;justify-content:space-between"><span>' + esc(idea ? idea.name : 'Item ' + (i + 1)) + '</span></div>'
            }).join('') +
            (s.items.length > 3 ? '<div style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.5);margin-top:4px">+' + (s.items.length - 3) + ' more</div>' : '') +
            (s.items.length === 0 ? '<p style="font-size:var(--font-16);color:rgba(138,130,120,.5)">No items yet.</p>' : '') +
            '<div style="margin-top:12px">' + btn('View Portfolio \u2192', 'go(\'' + s.nav + '\')', 'bs', 'font-size:var(--font-readable-sm);padding:6px 12px;width:100%') + '</div>', 'border-top:4px solid ' + s.c)
    });
    h += '</div>';
    // Data bank
    h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Data Bank</h3><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">' + [{
        id: 'out-report',
        l: 'Assessment Report',
        ic: '',
        c: '#1B6B5A'
    }, {
        id: 'out-orgready',
        l: 'Org Readiness',
        ic: '',
        c: '#2D5A8E'
    }, {
        id: 'out-raci',
        l: 'RACI Matrix',
        ic: '',
        c: '#2D5A8E'
    }, {
        id: 'out-capplan',
        l: 'Capital Plan',
        ic: '',
        c: '#8B5E3C'
    }, {
        id: 'out-govfw',
        l: 'Governance',
        ic: '',
        c: '#9B2D3F'
    }, {
        id: 'out-orgrev',
        l: 'Org Review',
        ic: '',
        c: '#9B2D3F'
    }].map(function(r) {
        return '<button onclick="go(\'' + r.id + '\')" style="padding:12px;border-radius:8px;border:1px solid rgba(245,242,236,.06);background:rgba(245,242,236,.03);cursor:pointer;text-align:left;font-family:var(--sans,Helvetica Neue,sans-serif)"><div style="font-size:16px;margin-bottom:4px">' + r.ic + '</div><div style="font-size:var(--font-16);font-weight:600;color:' + r.c + '">' + r.l + '</div></button>'
    }).join('') + '</div>', 'background:rgba(245,242,236,.02);border:1px solid rgba(245,242,236,.12)');
    return h + '</div></div>'
}

// === OUTCOME PAGES (simplified but functional) ===
function renderOutReport() {
    var co = data.completedSections || {};
    if (!co['1.1'] || !co['1.2'] || !co['1.3'] || !co['1.4'] || !co['1.5']) return '<h2 style="font-size:22px;font-weight:700">Assessment Report</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Complete all 5 assessment sections first.</p></div>');
    var p = data.purpose || {},
        k = data.knowledge || {},
        cu = data.culture || {},
        de = data.decisions || {};
    var cultureKeys = ['uncertainty', 'aiLegitimacy', 'newProposals', 'incentives', 'frontline', 'overall'];
    var cs = cultureKeys.map(function(k) {
        return typeof cu[k] === 'number' ? cu[k] : 0
    }).reduce(function(a, b) {
        return a + b
    }, 0);
    var gaps = Object.values(de).filter(function(d) {
        return d && d.gap
    }).length;
    return '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div><h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Assessment Report</h2><p style="color:rgba(138,130,120,.7);font-size:var(--font-16);">From your Assessment Battery</p></div>' + btn('? PDF', 'printReport()', 'bp', 'font-size:var(--font-16);') + '</div>' +
        card('<div style="font-size:var(--font-16);font-weight:700;color:#1B6B5A;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Executive Summary</div><p style="font-size:16px;color:#F5F2EC;line-height:1.7">Organization with ' + (k.usage === 'none' || k.usage === 'basic' ? 'limited' : 'moderate') + ' AI capabilities, ' + (cs <= 12 ? 'low' : cs <= 20 ? 'moderate' : 'strong') + ' cultural readiness (' + cs + '/30). ' + gaps + ' decision rights gap(s).</p>', 'background:rgba(27,107,90,.06);border:2px solid #1B6B5A;margin-bottom:20px') +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">' + card('<div style="text-align:center"><div style="font-size:24px;font-weight:600;color:#1B6B5A">' + cs + '/30</div><div style="font-size:var(--font-16);color:rgba(138,130,120,.7)">Culture Score</div></div>', 'padding:16px') + card('<div style="text-align:center"><div style="font-size:20px;font-weight:600;color:#2D5A8E">' + ((cu.uncertainty || 0) <= 2 ? 'Averse' : (cu.uncertainty || 0) <= 3 ? 'Moderate' : 'Tolerant') + '</div><div style="font-size:var(--font-16);color:rgba(138,130,120,.7)">Risk Appetite</div></div>', 'padding:16px') + card('<div style="text-align:center"><div style="font-size:24px;font-weight:600;color:' + (gaps ? '#9B2D3F' : '#1B6B5A') + '">' + gaps + '</div><div style="font-size:var(--font-16);color:rgba(138,130,120,.7)">Decision Gaps</div></div>', 'padding:16px') + '</div>' +
        card('<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Purpose & Direction</h3><div style="font-size:var(--font-16);;line-height:1.7"><strong>Mission:</strong> ' + esc(p.mission) + '<br/><br/><strong>Friction Points:</strong><br/><span style="white-space:pre-wrap">' + esc(p.frictions) + '</span></div>', 'margin-bottom:12px') +
        card('<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Decision Rights</h3>' + [{
            k: 'q1',
            l: 'Approve experiments'
        }, {
            k: 'q2',
            l: 'Advance projects'
        }, {
            k: 'q3',
            l: 'Reallocate budget'
        }, {
            k: 'q4',
            l: 'Kill projects'
        }, {
            k: 'q5',
            l: 'Cross-functional resources'
        }].map(function(q) {
            return '<div style="padding:6px 0;border-bottom:1px solid rgba(245,242,236,.06);font-size:var(--font-16);"><strong>' + q.l + ':</strong> ' + esc((de[q.k] || {}).who || '\u2014') + ((de[q.k] || {}).gap ? '<span style="color:#9B2D3F;font-weight:600"> ? ' + esc(de[q.k].gap) + '</span>' : '') + '</div>'
        }).join('')) + vizRadar()
}

function renderOutBluesky() {
    return '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Blue Sky Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Ideas and unassessed use cases.</p>' + pipeViz('bluesky') + '<div style="display:flex;gap:8px;margin-bottom:20px">' + btn('? Brainstorm', 'go(\'1.2\')', 'bs', 'font-size:var(--font-16)') + btn('? Filter & Rank', 'go(\'1.3\')', 'bs', 'font-size:var(--font-16)') + '</div>' + getStages().bluesky.map(function(i) {
        var idea = (data.ideas || [])[i];
        return card('<h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4><p style="font-size:var(--font-16);color:#8A8278;margin:4px 0 0">' + esc(idea ? idea.desc : '') + '</p>', 'border-left:4px solid #1B6B5A;margin-bottom:10px')
    }).join('')
}

function renderOutExplore() {
    return '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Exploration Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Projects under deeper assessment.</p>' + pipeViz('explore') + '<div style="display:flex;gap:8px;margin-bottom:20px">' + btn('? Deep Assessment', 'go(\'2.4\')', 'bs', 'font-size:var(--font-16)') + btn('? Design Experiments \u2192', 'go(\'3.3\')', 'bs', 'font-size:var(--font-16)') + '</div>' + getStages().explore.map(function(i) {
        var idea = (data.ideas || [])[i],
            as = data.assessments || {};
        return card('<div style="display:flex;justify-content:space-between"><div><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + ' ' + badge('Go', '#1B6B5A') + '</h4></div><div style="font-size:18px;font-weight:600;color:#2D5A8E">' + getScore(i) + '<span style="font-size:var(--font-control);color:rgba(138,130,120,.5)">/50</span></div></div>', 'border-left:4px solid #2D5A8E;margin-bottom:10px')
    }).join('')
}

function renderOutOrgReady() {
    var co = data.completedSteps || {};
    if (!(co['2.1'] && co['2.2'] && co['2.3'])) return '<h2 style="font-size:22px;font-weight:700">Org Readiness</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Complete Steps 1\u20133 first.</p></div>');
    var ow = data.ownership || {},
        inc = data.incentives || {},
        rh = data.rhythm || {};
    return '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div><h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Org Readiness Summary</h2><p style="color:rgba(138,130,120,.7);font-size:var(--font-16);">From Phase 2, Steps 120133</p></div>' + btn('? PDF', 'printOrgReady()', 'bp', 'font-size:var(--font-16);') + '</div>' +
        card('<div style="font-size:var(--font-16);font-weight:700;color:#2D5A8E;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Summary</div><p style="font-size:16px;color:#F5F2EC;line-height:1.7">' + esc(ow.ownerName) + ' (' + esc(ow.ownerRole) + ') owns the pipeline. ' + (ow.leads || []).length + ' embedded leads. Innovation rhythm: ' + esc(rh.day) + ' ' + esc(rh.time || '') + '. Incentives realigning.</p>', 'background:rgba(45,90,142,.06);border:2px solid #2D5A8E;margin-bottom:20px') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">' + card('<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Pipeline Owner</h3><p style="font-size:var(--font-16);"><strong>' + esc(ow.ownerName) + '</strong> (' + esc(ow.ownerRole) + ')<br/>' + esc(ow.authority) + '</p>') + card('<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Innovation Rhythm</h3><p style="font-size:var(--font-16);">Every <strong>' + esc(rh.day) + '</strong> at ' + esc(rh.time || 'TBD') + '<br/>' + esc(rh.attendees) + '</p>') + '</div>' +
        card('<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Incentive Changes</h3><p style="font-size:var(--font-16);"><strong>From:</strong> ' + esc(inc.current) + '<br/><strong>To:</strong> ' + esc(inc.changes) + '<br/><strong>Metrics:</strong> ' + esc((inc.metrics || []).join(', ') || 'None selected') + '</p>') +
        (function() {
            var chk = [{
                l: 'Pipeline owner named with explicit authority',
                d: !!ow.ownerName && !!ow.authority
            }, {
                l: 'At least one embedded lead assigned',
                d: (ow.leads || []).length >= 1 && !!(ow.leads || [])[0] && !!(ow.leads || [])[0].name
            }, {
                l: 'Incentive structure addresses experimentation',
                d: !!inc.changes
            }, {
                l: 'Innovation metrics selected (2+)',
                d: (inc.metrics || []).length >= 2
            }, {
                l: 'Weekly innovation session scheduled',
                d: !!rh.day && !!rh.attendees
            }, {
                l: 'Standing agenda defined',
                d: !!rh.agenda
            }, {
                l: 'Deep assessment completed',
                d: !!(data.completedSteps || {})['2.4']
            }, {
                l: 'Communication plan in place',
                d: (inc.metrics || []).length >= 3
            }];
            var done = chk.filter(function(c) {
                return c.d
            }).length;
            var pct = Math.round(done / chk.length * 100);
            return card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Organizational Readiness Checklist</h3>' + chk.map(function(c, i) {
                return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:' + (i < chk.length - 1 ? '1px solid rgba(245,242,236,.04)' : 'none') + '"><div style="width:20px;height:20px;border-radius:10px;background:' + (c.d ? '#1B6B5A' : 'rgba(245,242,236,.06)') + ';color:' + (c.d ? 'rgba(245,242,236,.03)' : '#ccc') + ';display:flex;align-items:center;justify-content:center;font-size:var(--font-control);font-weight:700;flex-shrink:0">' + (c.d ? '\u2713' : '\u25cb') + '</div><span style="font-size:var(--font-16);;color:' + (c.d ? '#F5F2EC' : 'rgba(138,130,120,.5)') + '">' + c.l + '</span></div>'
            }).join('') + '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:var(--font-16);color:rgba(138,130,120,.7);margin-bottom:4px"><span>Readiness</span><span>' + done + '/' + chk.length + ' \xb7 ' + pct + '%</span></div><div style="height:8px;background:rgba(245,242,236,.04);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + (pct === 100 ? '#1B6B5A' : '#2D5A8E') + ';border-radius:4px;transition:width .3s"></div></div></div>', 'margin-top:12px')
        })()
}

function renderOutGovFW() {
    var co = data.completedSteps || {};
    if (!co['4.2']) return '<h2 style="font-size:22px;font-weight:700">Governance Framework</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Complete Phase 4 Step 2 first.</p></div>');
    var gov = data.governance || {};
    var h = '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px"><div>' + badge('Phase 4 Output', '#9B2D3F') + '<h2 style="font-size:24px;font-weight:600;margin:8px 0 4px">Governance Framework</h2><p style="color:var(--stone);font-size:var(--font-16);">Three mechanisms for sustainable innovation</p></div>' + btn('? PDF', 'printGovFW()', 'bp', 'font-size:var(--font-16);') + '</div>';
    h += card('<div style="font-family:var(--sans);font-size:var(--font-control);font-weight:700;color:#9B2D3F;text-transform:uppercase;letter-spacing:.15em;margin-bottom:8px">Executive Summary</div><p style="font-size:16px;color:var(--paper);line-height:1.7;margin:0">Governance embedded across three mechanisms: standing agenda in <strong>' + esc(gov.meeting || 'leadership meetings') + '</strong>, stage-gates above <strong>' + esc(gov.threshold || 'threshold') + '</strong>, quarterly reviews from <strong>' + esc(gov.firstReview || 'TBD') + '</strong>.</p>', 'background:rgba(155,45,63,.04);border:1px solid rgba(155,45,63,.2);margin-bottom:20px');
    var pillars = [{
        ic: '',
        t: 'Standing Leadership Agenda',
        c: '#1B6B5A',
        items: [{
            l: 'Embedded in',
            v: gov.meeting
        }, {
            l: 'Metrics',
            v: gov.metrics || '\u2014'
        }, {
            l: 'Format',
            v: gov.format || '\u2014'
        }]
    }, {
        ic: '',
        t: 'Stage-Gate Discipline',
        c: '#2D5A8E',
        items: [{
            l: 'Threshold',
            v: gov.threshold
        }, {
            l: 'Process',
            v: gov.gateProcess || '\u2014'
        }, {
            l: 'Frequency',
            v: gov.milestoneFreq || '\u2014'
        }]
    }, {
        ic: '',
        t: 'Quarterly Review',
        c: '#8B5E3C',
        items: [{
            l: 'Attendees',
            v: gov.reviewAttendees
        }, {
            l: 'Agenda',
            v: gov.reviewAgenda || '\u2014'
        }, {
            l: 'First review',
            v: gov.firstReview || '\u2014'
        }]
    }];
    pillars.forEach(function(p) {
        h += card('<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="font-size:24px">' + p.ic + '</span><h3 style="font-size:17px;font-weight:700;margin:0;color:var(--paper)">' + p.t + '</h3></div>' + p.items.map(function(it) {
            return '<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid rgba(245,242,236,.04)"><div style="font-family:var(--sans);font-size:var(--font-control);font-weight:700;color:' + p.c + ';text-transform:uppercase;letter-spacing:.1em;min-width:110px;padding-top:2px">' + it.l + '</div><div style="font-size:var(--font-16);;color:var(--paper);line-height:1.6;flex:1">' + esc(it.v) + '</div></div>'
        }).join(''), 'border-left:3px solid ' + p.c + ';margin-bottom:12px')
    });
    return h
}

function renderOutOrgRev() {
    var co = data.completedSteps || {};
    if (!co['4.3']) return '<h2 style="font-size:22px;font-weight:700">Org Design Review</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Complete Phase 4 Step 3 first.</p></div>');
    var stress = data.stress || {};
    return '<h2 style="font-size:22px;font-weight:700;margin:0 0 20px">Organizational Design Review</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">' + [{
            k: 'decisions',
            l: 'Decision Rights',
            ic: ''
        }, {
            k: 'ownership',
            l: 'Ownership Model',
            ic: ''
        }, {
            k: 'incentives',
            l: 'Incentive Changes',
            ic: ''
        }, {
            k: 'culture',
            l: 'Culture Shift',
            ic: ''
        }].map(function(q) {
            var sc = stress[q.k + 'Score'] || 0;
            return card('<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span>' + q.ic + '</span><div style="font-size:16px;font-weight:700">' + q.l + '</div><div style="margin-left:auto;padding:2px 10px;border-radius:12px;font-size:var(--font-16);font-weight:700;background:' + (sc >= 4 ? 'rgba(27,107,90,.08)' : sc >= 3 ? 'rgba(139,94,60,.06)' : 'rgba(155,45,63,.06)') + ';color:' + (sc >= 4 ? '#1B6B5A' : sc >= 3 ? '#8B5E3C' : '#9B2D3F') + '">' + sc + '/5</div></div><p style="font-size:var(--font-16);;color:#d4cfca;margin:0">' + esc(stress[q.k] || '\u2014') + '</p>')
        }).join('') + '</div>' +
        card('<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Adjustment Plan</h3>' + (stress.tuningList || []).filter(function(t) {
            return t
        }).map(function(t, i) {
            return '<div style="font-size:var(--font-16);;color:#d4cfca;padding:6px 0;border-bottom:1px solid rgba(245,242,236,.06)"><strong style="color:#9B2D3F">' + (i + 1) + '.</strong> ' + esc(t) + '</div>'
        }).join(''), 'border:2px solid #9B2D3F')
}

function renderOutDevport() {
    return '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Development Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;font-size:16px">Your scored and balanced portfolio.</p>' + pipeViz('experiment') + '<div style="display:flex;gap:8px;margin-bottom:20px">' + btn('\u25b6 Start Experiments', 'go(\'4.1\')', 'bs', 'font-size:var(--font-16)') + '</div>'
}

function renderOutCapplan() {
    var cap = data.capital || {};
    if (!cap.required) return '<h2 style="font-size:22px;font-weight:700">Capital Plan</h2>' + card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Complete Phase 3 Step 2.</p></div>');
    var h = '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px"><div>' + badge('Phase 3 Output', '#8B5E3C') + '<h2 style="font-size:24px;font-weight:600;margin:8px 0 4px">Capital Allocation Plan</h2><p style="color:var(--stone);font-size:var(--font-16);">Resource allocation for your innovation portfolio</p></div>' + btn('? PDF', 'printCapPlan()', 'bp', 'font-size:var(--font-16);') + '</div>';
    h += card('<div style="font-family:var(--sans);font-size:var(--font-control);font-weight:700;color:#8B5E3C;text-transform:uppercase;letter-spacing:.15em;margin-bottom:12px">Financial Summary</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' + [{
        l: 'Total Required',
        v: cap.required,
        c: '#8B5E3C',
        ic: ''
    }, {
        l: 'Currently Budgeted',
        v: cap.budgeted || '\u2014',
        c: '#1B6B5A',
        ic: ''
    }, {
        l: 'Reallocation Plan',
        v: cap.reallocation || '\u2014',
        c: '#2D5A8E',
        ic: ''
    }, {
        l: 'Gap & Contingency',
        v: cap.gapPlan || '\u2014',
        c: '#9B2D3F',
        ic: ''
    }].map(function(m) {
        return '<div style="padding:16px;background:rgba(245,242,236,.02);border-radius:8px;border-left:3px solid ' + m.c + '"><div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="font-size:16px">' + m.ic + '</span><span style="font-family:var(--sans);font-size:var(--font-label);font-weight:700;color:' + m.c + ';text-transform:uppercase;letter-spacing:.1em">' + m.l + '</span></div><div style="font-size:18px;font-weight:600;color:var(--paper)">' + esc(m.v) + '</div></div>'
    }).join('') + '</div>', 'background:rgba(139,94,60,.04);border:1px solid rgba(139,94,60,.2);margin-bottom:16px');
    if (cap.approachNotes) h += card('<div style="font-family:var(--sans);font-size:var(--font-control);font-weight:700;color:var(--stone);text-transform:uppercase;letter-spacing:.15em;margin-bottom:8px">Approach Notes</div><p style="font-size:var(--font-16);;color:var(--paper);line-height:1.7">' + esc(cap.approachNotes) + '</p>');
    return h
}

function renderOutFinalport() {
    return '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Updated Development Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;font-size:16px">Your portfolio after the first review cycle.</p>' + pipeViz('experiment')
}

function renderOutRaci() {
    return '<h2 style="font-size:22px;font-weight:700;margin:0 0 20px">RACI Matrix</h2><p style="color:#8A8278;font-size:16px;margin-bottom:20px">R=Responsible A=Accountable C=Consulted I=Informed</p><p style="font-size:var(--font-16);;color:rgba(138,130,120,.7)">Complete the RACI matrix in the interactive view (Phase 2 \u2192 Ownership).</p>'
}

function renderOutExpbriefs() {
    return renderOutDevport()
}
// === MAIN RENDER ===

// === PDF EXPORT FUNCTIONS ===
function printPage(title, contentFn) {
    var content = contentFn();
    var w = window.open('');
    w.document.write('<html><head><title>' + title + '</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">' +
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Helvetica Neue",Arial,sans-serif;max-width:750px;margin:40px auto;padding:0 40px;line-height:1.7;font-size:16px;color:#1a1612;background:#fff}' +
        'h1,h2,h3,h4{color:#1a1612}a{color:#2D5A8E}' +
        '.btn,.btn-ghost,.bp,.bs,.bg,.bg2,.bd{display:none !important}' +
        'select{-webkit-appearance:none;appearance:none;border:none;background:none;font-weight:600;font-size:var(--font-16);;color:#1a1612}' +
        'textarea{border:none;background:none;font-size:var(--font-16);;color:#1a1612;resize:none}' +
        'button{display:none !important}' +
        '@media print{body{margin:0;padding:20px}}' +
        '</style></head><body>' + content + '</body></html>');
    w.document.close();
    setTimeout(function() {
        w.print()
    }, 500)
}

function printReport() {
    printPage('Assessment Report', renderOutReport)
}

function printOrgReady() {
    printPage('Organizational Readiness', renderOutOrgReady)
}

function printCapPlan() {
    printPage('Capital Allocation Plan', renderOutCapplan)
}

function printGovFW() {
    printPage('Governance Framework', renderOutGovFW)
}

// === ENHANCED OUTCOME PAGES (replacing skeletons) ===

function renderOutRaciFull() {
    var ow = data.ownership || {},
        raci = data.raci || {};
    var roles = [ow.ownerName || 'Pipeline Owner'].concat((ow.leads || []).map(function(l) {
        return l.name || l.dept
    }).filter(Boolean).slice(0, 4)).concat(['Finance']);
    var acts = ['Approve experiments', 'Advance projects', 'Allocate budget', 'Kill projects', 'Pipeline reporting', 'Weekly session', 'Quarterly review'];
    var h = '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">RACI Matrix</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">R=Responsible A=Accountable C=Consulted I=Informed</p>';
    h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:var(--font-16);"><thead><tr><th style="text-align:left;padding:10px;border-bottom:2px solid var(--gold);color:#2D5A8E">Activity</th>';
    roles.forEach(function(r) {
        h += '<th style="padding:10px;border-bottom:2px solid var(--gold);color:#2D5A8E;min-width:80px;text-align:center">' + esc(r) + '</th>'
    });
    h += '</tr></thead><tbody>';
    acts.forEach(function(a, ai) {
        h += '<tr style="background:' + (ai % 2 === 0 ? 'rgba(245,242,236,.04)' : 'rgba(245,242,236,.01)') + '"><td style="padding:10px;border-bottom:1px solid rgba(245,242,236,.06);font-weight:600">' + a + '</td>';
        roles.forEach(function(r, ri) {
            var key = ai + '-' + ri;
            var v = raci[key] || '';
            var colors = {
                R: '#1B6B5A',
                A: '#2D5A8E',
                C: '#8B5E3C',
                I: 'rgba(138,130,120,.5)'
            };
            h += '<td style="padding:6px;border-bottom:1px solid rgba(245,242,236,.06);text-align:center"><select id="raci_' + key + '" onchange="saveRaci(\'' + key + '\')" style="padding:4px;border-radius:4px;border:1px solid rgba(245,242,236,.12);font-size:var(--font-16);;font-family:var(--sans);width:50px;text-align:center;font-weight:600;background:rgba(245,242,236,.06);color:' + (colors[v] || 'rgba(138,130,120,.4)') + '"><option value="">\u2014</option><option value="R"' + (v === 'R' ? ' selected' : '') + '>R</option><option value="A"' + (v === 'A' ? ' selected' : '') + '>A</option><option value="C"' + (v === 'C' ? ' selected' : '') + '>C</option><option value="I"' + (v === 'I' ? ' selected' : '') + '>I</option></select></td>'
        });
        h += '</tr>'
    });
    h += '</tbody></table></div>';
    return h
}

function saveRaci(key) {
    if (!data.raci) data.raci = {};
    data.raci[key] = val('raci_' + key);
    saveData()
}

function renderOutDevportFull() {
    var ideas = data.ideas || [],
        as = data.assessments || {},
        port = data.portfolio || {},
        stages = getStages();
    var goP = [].concat(stages.explore, stages.experiment, stages.operational || []);
    var h = '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Development Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Your scored and balanced portfolio across time horizons.</p>';
    h += pipeViz('experiment');
    if (!goP.length) {
        h += card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Complete Phase 3 Step 1.</p></div>');
        return h
    }
    h += '<div style="display:flex;gap:16px;margin-bottom:24px">';
    ['quick', 'medium', 'long'].forEach(function(hh) {
        var items = goP.filter(function(i) {
            return (port[i] || {}).horizon === hh
        });
        h += '<div style="flex:1;text-align:center;padding:16px;background:rgba(245,242,236,.03);border-radius:10px;border:1px solid rgba(245,242,236,.06)"><div style="font-size:24px;font-weight:600;color:#8B5E3C">' + items.length + '</div><div style="font-size:var(--font-16);color:rgba(138,130,120,.7)">' + (hh === 'quick' ? 'Quick Wins' : hh === 'medium' ? 'Medium-Term' : 'Long-Term') + '</div></div>'
    });
    h += '</div>';
    goP.sort(function(a, b) {
        return getScore(b) - getScore(a)
    }).forEach(function(i, rank) {
        var idea = ideas[i],
            p = port[i] || {};
        var hColor = p.horizon === 'quick' ? '#1B6B5A' : p.horizon === 'medium' ? '#2D5A8E' : '#8B5E3C';
        h += card('<div style="display:flex;justify-content:space-between"><div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:var(--font-16);font-weight:700;color:rgba(138,130,120,.7)">#' + (rank + 1) + '</span><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + badge(p.horizon || '\u2014', hColor) + '</div></div><div style="font-size:18px;font-weight:600;color:#8B5E3C">' + getScore(i) + '<span style="font-size:var(--font-control);color:rgba(138,130,120,.5)">/50</span></div></div>', 'margin-bottom:10px;border-left:4px solid ' + hColor)
    });
    return h
}

function renderOutExpbriefsFull() {
    var ideas = data.ideas || [],
        exp = data.experiments || {},
        exSel = data.expSelected || [],
        trk = data.tracking || {},
        stages = getStages();
    var h = '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Experiment Briefs</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Experiments in progress. Start experiments, track results, and launch completed projects.</p>';
    h += pipeViz('experiment');
    h += '<div style="display:flex;gap:8px;margin-bottom:20px">' + btn('\u25b6 Start Experiments', 'go(\'4.1\')', 'bs', 'font-size:var(--font-16)') + btn('Launch to Operational', 'go(\'launch-proj\')', 'bs', 'font-size:var(--font-16)') + '</div>';
    if (stages.experiment.length === 0) {
        h += card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">' + (exSel.length > 0 ? 'All experiments have been launched to Operational.' : 'Design experiments in Phase 3 Step 3 to populate.') + '</p></div>');
        return h
    }
    stages.experiment.forEach(function(i, rank) {
        var e = exp[i] || {},
            idea = ideas[i],
            tr = trk[i] || {};
        h += card('<div style="display:flex;justify-content:space-between;margin-bottom:12px"><div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="UI.showEx=' + i + ';go(\'3.3\')"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:12px;background:#8B5E3C;color:#fff;font-size:var(--font-readable-sm);font-weight:700">#' + (rank + 1) + '</span><h4 style="font-size:15px;font-weight:700;margin:0;color:var(--gold)">' + esc(idea ? idea.name : '') + '</h4><span style="color:var(--stone);font-size:var(--font-readable-sm)">\u2192 edit</span>' + (tr.status ? badge(tr.status, tr.status === 'complete' ? '#1B6B5A' : tr.status === 'running' ? '#2D5A8E' : 'rgba(138,130,120,.5)') : '') + '</div>' + badge('Experiment', '#8B5E3C') + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:12px">' + [{
                l: 'OWNER',
                v: e.owner
            }, {
                l: 'BUDGET',
                v: e.budget
            }, {
                l: 'TIMELINE',
                v: e.timeline
            }, {
                l: 'SUCCESS METRIC',
                v: e.successMetric
            }].map(function(m) {
                return '<div><div style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.7);font-weight:600">' + m.l + '</div><div style="font-size:var(--font-16);;font-weight:600">' + esc(m.v || '\u2014') + '</div></div>'
            }).join('') + '</div>' +
            (tr.results ? '<div style="padding:10px;background:rgba(245,242,236,.02);border-radius:6px;margin-bottom:8px;font-size:var(--font-16);color:#d4cfca"><strong>Results:</strong> ' + esc(tr.results) + '</div>' : '') +
            (e.testing ? '<p style="font-size:var(--font-16);;color:#d4cfca;margin:0 0 4px"><strong>Testing:</strong> ' + esc(e.testing) + '</p>' : ''), 'margin-bottom:16px;border-left:4px solid #8B5E3C')
    });
    return h
}

function renderOutFinalportFull() {
    var ideas = data.ideas || [],
        as = data.assessments || {},
        port = data.portfolio || {},
        rev = data.review || {},
        exSel = data.expSelected || [],
        trk = data.tracking || {},
        stages = getStages();
    var allItems = [].concat(stages.explore, stages.experiment, stages.operational || []);
    var h = '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Updated Development Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Your innovation portfolio after the first review cycle.</p>';
    h += pipeViz('experiment');
    if (!allItems.length) {
        h += card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Complete Phase 4 to see your updated portfolio.</p></div>');
        return h
    }
    allItems.sort(function(a, b) {
        return getScore(b) - getScore(a)
    }).forEach(function(i, rank) {
        var idea = ideas[i],
            ri = (rev.items || {})[i] || {},
            tr = trk[i] || {},
            p = port[i] || {};
        var isExp = exSel.indexOf(i) >= 0;
        var decColor = ri.decision === 'buy' ? '#1B6B5A' : ri.decision === 'sell' ? '#9B2D3F' : ri.decision === 'hold' ? '#8B5E3C' : '#2D5A8E';
        h += card('<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:var(--font-16);font-weight:700;color:rgba(138,130,120,.7)">#' + (rank + 1) + '</span><h4 style="font-size:15px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + (isExp ? badge('Experiment', '#8B5E3C') : '') + (ri.decision ? badge(ri.decision === 'buy' ? 'Scale' : ri.decision === 'sell' ? 'Kill' : 'Hold', decColor) : '') + '</div>' + (tr.results ? '<p style="font-size:var(--font-16);color:#8A8278;margin:4px 0 0 28px">' + esc(tr.results.slice(0, 120)) + '</p>' : '') + (ri.rationale ? '<p style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.7);margin:4px 0 0 28px"><em>Rationale:</em> ' + esc(ri.rationale) + '</p>' : '') + '</div><div style="text-align:center;min-width:50px"><div style="font-size:18px;font-weight:600;color:#9B2D3F">' + getScore(i) + '</div><div style="font-size:var(--font-control);color:rgba(138,130,120,.5)">/50</div></div></div>', 'margin-bottom:12px;border-left:4px solid ' + decColor)
    });
    if (rev.newOpportunities) h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">New Opportunities for Next Cycle</h3><p style="font-size:var(--font-16);;color:#d4cfca;margin-top:8px;white-space:pre-wrap">' + esc(rev.newOpportunities) + '</p>', 'margin-top:20px;border:1px dashed rgba(27,107,90,.5)');
    if (rev.nextCycle) h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Changes for Next Cycle</h3><p style="font-size:var(--font-16);;color:#d4cfca;margin-top:8px;white-space:pre-wrap">' + esc(rev.nextCycle) + '</p>', 'margin-top:12px');
    return h
}

function renderOutExploreEnhanced() {
    var ideas = data.ideas || [],
        proj = data.projects || {},
        as = data.assessments || {},
        stages = getStages();
    var h = '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Exploration Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Projects under deeper assessment. Advance them to Development.</p>';
    h += pipeViz('explore');
    if (stages.explore.length === 0 && stages.noGo.length === 0) {
        h += card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">Select and assess projects to populate this portfolio.</p><div style="margin-top:16px">' + btn('? Go to Deep Assessment', 'go(\'2.4\')', 'bs', 'font-size:var(--font-16);') + '</div></div>');
        return h
    }
    if (stages.explore.length > 0) {
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="font-size:16px;font-weight:700;color:#2D5A8E;margin:0">In Exploration (' + stages.explore.length + ')</h3><div style="display:flex;gap:8px">' + btn('? Deep Assessment', 'go(\'2.4\')', 'bs', 'font-size:var(--font-16);padding:6px 14px') + btn('? Design Experiments \u2192', 'go(\'3.3\')', 'bs', 'font-size:var(--font-16);padding:6px 14px') + '</div></div>';
        stages.explore.sort(function(a, b) {
            return getScore(b) - getScore(a)
        }).forEach(function(i) {
            var idea = ideas[i];
            h += card('<div style="display:flex;justify-content:space-between"><div><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + ' ' + badge('Go', '#1B6B5A') + '</h4><p style="font-size:var(--font-16);color:#8A8278;margin:4px 0 0">' + esc((proj[i] || {}).objectives || (idea ? idea.desc : '')) + '</p></div><div style="text-align:center;min-width:50px"><div style="font-size:18px;font-weight:600;color:#2D5A8E">' + getScore(i) + '</div><div style="font-size:var(--font-control);color:rgba(138,130,120,.5)">/50</div></div></div>', 'margin-bottom:10px;border-left:4px solid #2D5A8E')
        })
    }
    if (stages.noGo.length > 0) {
        h += '<div style="margin-top:20px"><h3 style="font-size:16px;font-weight:700;color:#9B2D3F;margin-bottom:8px">Not Advancing (' + stages.noGo.length + ')</h3>';
        stages.noGo.forEach(function(i) {
            h += '<div style="padding:8px 0;font-size:var(--font-16);;color:rgba(138,130,120,.5);border-bottom:1px solid rgba(245,242,236,.06)">' + esc((ideas[i] || {}).name) + ' \u2014 ' + esc((proj[i] || {}).noGoReason || 'Failed viability') + '</div>'
        });
        h += '</div>'
    }
    return h
}

function renderOutOperFull() {
    var ideas = data.ideas || [],
        stages = getStages(),
        trk = data.tracking || {},
        exp = data.experiments || {},
        opsData = data.opsData || {};
    var operational = stages.operational || [];
    var h = '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Operational Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Live projects deployed in your business. Monitor performance and manage operations.</p>';
    h += pipeViz('operate', {
        bluesky: 'nav-bluesky',
        explore: 'nav-explore',
        experiment: 'nav-develop',
        operate: 'out-oper'
    });
    if (!operational.length) {
        h += card('<div style="text-align:center;padding:48px"><div style="font-size:40px;margin-bottom:16px">&#9679;</div><p style="color:rgba(138,130,120,.5);font-size:15px">No operational projects yet.</p><p style="color:rgba(138,130,120,.3);font-size:var(--font-16);;margin-top:8px">Projects move here when launched from Development or given a "Buy/Scale" decision.</p><div style="margin-top:16px">' + btn('? Go to Launch Project', 'go(\'launch-proj\')', 'bs', 'font-size:var(--font-16);') + '</div></div>');
        return h
    }
    operational.forEach(function(i) {
        var idea = ideas[i],
            e = exp[i] || {},
            tr = trk[i] || {},
            ops = opsData[i] || {};
        var hColor = ops.health === 'green' ? '#1B6B5A' : ops.health === 'amber' ? '#D4A017' : ops.health === 'red' ? '#9B2D3F' : '#2D5A8E';
        h += card('<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><h4 style="font-size:16px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + badge('Operational', '#1B6B5A') + '</div><p style="font-size:var(--font-16);;color:#8A8278;margin:4px 0 0">' + esc(idea ? idea.desc : '') + '</p></div><div style="display:flex;gap:4px">' + ['green', 'amber', 'red'].map(function(hh) {
                return '<button onclick="setOpsHealth(' + i + ',\'' + hh + '\')" style="width:28px;height:28px;border-radius:14px;border:' + (ops.health === hh ? '2px solid #333' : '1px solid rgba(245,242,236,.12)') + ';background:' + (hh === 'green' ? '#1B6B5A' : hh === 'amber' ? '#D4A017' : '#9B2D3F') + ';opacity:' + (ops.health === hh ? 1 : .3) + ';cursor:pointer"></button>'
            }).join('') + '</div></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px"><div style="padding:12px;background:rgba(245,242,236,.02);border-radius:8px"><div style="font-size:var(--font-readable-sm);font-weight:600;color:rgba(138,130,120,.7);margin-bottom:4px">OWNER</div><div style="font-size:var(--font-16);;font-weight:600">' + esc(ops.owner || e.owner || '\u2014') + '</div></div><div style="padding:12px;background:rgba(245,242,236,.02);border-radius:8px"><div style="font-size:var(--font-readable-sm);font-weight:600;color:rgba(138,130,120,.7);margin-bottom:4px">LAUNCH DATE</div><input type="date" id="ops_' + i + '_ld" value="' + esc(ops.launchDate || '') + '" onchange="updNested(\'opsData\',' + i + ',\'launchDate\',this.value)" style="width:100%;padding:6px;border:1px solid rgba(245,242,236,.12);border-radius:4px;font-size:var(--font-16);font-family:var(--sans,Helvetica Neue,sans-serif);box-sizing:border-box"/></div><div style="padding:12px;background:rgba(245,242,236,.02);border-radius:8px"><div style="font-size:var(--font-readable-sm);font-weight:600;color:rgba(138,130,120,.7);margin-bottom:4px">SUCCESS METRIC</div><div style="font-size:var(--font-16);">' + esc(e.successMetric || '\u2014') + '</div></div></div>' +
            ta('Performance vs. success metric', 'ops_' + i + '_perf', ops.performance, 'e.g. Quote turnaround averaging 3.5 hours (target: <4 hours) \u2713', 2) +
            ta('Ongoing notes', 'ops_' + i + '_notes', ops.notes, 'e.g. Week 3: Added 2 new product categories...', 3) + '<div style="display:flex;justify-content:flex-end"><button onclick="if(confirm(\'Sunset this project? It will be archived.\'))updNested(\'opsData\',' + i + ',\'sunset\',true)" style="padding:6px 14px;border-radius:6px;font-size:var(--font-16);font-weight:600;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:1px solid rgba(245,242,236,.12);background:' + (ops.sunset ? 'rgba(155,45,63,.06)' : 'rgba(245,242,236,.03)') + ';color:' + (ops.sunset ? '#9B2D3F' : 'rgba(138,130,120,.5)') + '">' + (ops.sunset ? '× Sunsetted' : '× Sunset Project') + '</button></div>', 'margin-bottom:16px;border-left:4px solid ' + hColor)
    });
    return h
}

function setOpsHealth(i, h) {
    updNested('opsData', i, 'health', h)
}

// === PHASE 5 NAVIGATE PORTFOLIO VIEWS ===
var NAV_MAP = {
    bluesky: 'nav-bluesky',
    explore: 'nav-explore',
    experiment: 'nav-develop',
    operate: 'out-oper'
};

function renderNavBluesky() {
    var _w = '<div style="padding-top:110px"><div class="wrap" style="max-width:800px;padding:0 24px 80px">';
    var backH = '<button class="btn-ghost" style="font-size:var(--font-control);padding:7px 14px;margin-bottom:16px" onclick="go(\'phase5\')">\u2190 Pipeline Dashboard</button>';

    var ideas = data.ideas || [],
        as = data.assessments || {},
        stages = getStages();

    function gs(i) {
        var a = as[i];
        if (!a) return null;
        var f = a.techCapable && a.resourcesAvailable && a.culturalFit && a.purposeAligned && a.affordable;
        if (!f) return null;
        return (a.priority || 0) + (a.risk || 0) + (a.value || 0) + (a.costScore || 0) + (a.difficulty || 0)
    }
    var ranked = stages.bluesky.map(function(i) {
        return {
            i: i,
            idea: ideas[i],
            score: gs(i)
        }
    }).sort(function(a, b) {
        if (a.score !== null && b.score !== null) return b.score - a.score;
        if (a.score !== null) return -1;
        if (b.score !== null) return 1;
        return 0
    });

    var h = _w + backH + '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Blue Sky Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Add ideas, assess and score them, then advance the top-ranked to Exploration.</p>';
    h += pipeViz('bluesky', NAV_MAP);
    h += '<div style="margin-bottom:20px">' + btn(UI.addForm ? 'Cancel' : '+ Add New Idea', 'UI.addForm=!UI.addForm;render()', 'bs', 'font-size:var(--font-16);') + '</div>';

    if (UI.addForm) {
        h += card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">New Idea</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">' + ta('Name *', 'ni_name', UI.ni.name, 'e.g. AI Inventory Forecasting', 1) + ta('Department', 'ni_dept', UI.ni.dept, 'e.g. Operations', 1) + '</div>' + ta('Description', 'ni_desc', UI.ni.desc, 'What would this AI solution do?', 2) + ta('Strategic need', 'ni_strategic', UI.ni.strategic, 'Which problem does this address?', 2) + '<div style="display:flex;gap:12px">' + sel('Cost', 'ni_cost', UI.ni.cost, [{
            v: '',
            l: '...'
        }, {
            v: 'Low',
            l: 'Low'
        }, {
            v: 'Medium',
            l: 'Medium'
        }, {
            v: 'High',
            l: 'High'
        }]) + sel('Timeframe', 'ni_tf', UI.ni.timeframe, [{
            v: '',
            l: '...'
        }, {
            v: '1-3mo',
            l: '1-3mo'
        }, {
            v: '3-6mo',
            l: '3-6mo'
        }, {
            v: '6-12mo',
            l: '6-12mo'
        }]) + '</div>' + btn('Add to Blue Sky', 'addNavIdea()', 'bp', 'margin-top:8px'), 'margin-bottom:20px;border:1px solid rgba(27,107,90,.2);background:rgba(27,107,90,.04)')
    }

    if (ranked.length === 0) {
        h += card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">No ideas in Blue Sky. Add your first idea above.</p></div>')
    } else {
        ranked.forEach(function(r) {
            var i = r.i,
                idea = r.idea,
                score = r.score;
            var a = as[i] || {};
            var allG = a.techCapable !== undefined && a.resourcesAvailable !== undefined && a.culturalFit !== undefined && a.purposeAligned !== undefined && a.affordable !== undefined;
            var feasible = a.techCapable && a.resourcesAvailable && a.culturalFit && a.purposeAligned && a.affordable;
            var anyNo = allG && !feasible;
            h += card('<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><h4 style="font-size:15px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4><p style="font-size:var(--font-16);color:rgba(138,130,120,.7);margin:4px 0 0">' + esc(idea ? idea.desc : '') + ((idea && idea.dept) ? ' \xb7 ' + esc(idea.dept) : '') + '</p></div><div style="display:flex;gap:8px;align-items:center">' + (anyNo ? badge('Disqualified', '#9B2D3F') : '') + (score !== null ? '<div style="text-align:center;padding:6px 12px;background:rgba(27,107,90,.08);border-radius:8px;min-width:50px"><div style="font-size:18px;font-weight:600;color:#1B6B5A">' + score + '</div><div style="font-size:var(--font-control);color:rgba(138,130,120,.5)">/50</div></div>' : '') + (score !== null ? btn('Advance \u2192', 'advanceFromBluesky(' + i + ')', 'bs', 'font-size:var(--font-readable-sm);padding:4px 12px') : '') + '</div></div>' +
                '<div style="font-size:var(--font-16);font-weight:600;color:#d4cfca;margin-bottom:6px">Feasibility Gates</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + [{
                    k: 'techCapable',
                    l: 'Tech?'
                }, {
                    k: 'resourcesAvailable',
                    l: 'Resources?'
                }, {
                    k: 'culturalFit',
                    l: 'Culture?'
                }, {
                    k: 'purposeAligned',
                    l: 'Purpose?'
                }, {
                    k: 'affordable',
                    l: 'Affordable?'
                }].map(function(g) {
                    var v = a[g.k];
                    return '<button onclick="toggleGate(' + i + ',\'' + g.k + '\')" class="gate-btn' + (v === true ? ' pass' : v === false ? ' fail' : '') + '">' + (v === true ? '\u2713' : v === false ? '\u2717' : '\u25cb') + ' ' + g.l + '</button>'
                }).join('') + '</div>' +
                (feasible ? '<div style="font-size:var(--font-16);font-weight:600;color:#d4cfca;margin-bottom:6px">Score (0\u201310 each)</div><div style="display:flex;gap:8px;flex-wrap:wrap">' + [{
                    k: 'priority',
                    l: 'Priority'
                }, {
                    k: 'risk',
                    l: 'Risk(10=low)'
                }, {
                    k: 'value',
                    l: 'Value'
                }, {
                    k: 'costScore',
                    l: 'Cost(10=low)'
                }, {
                    k: 'difficulty',
                    l: 'Ease(10=easy)'
                }].map(function(d) {
                    return '<div><label style="font-size:var(--font-control);color:#8A8278">' + d.l + '</label><input type="number" min="0" max="10" id="score_' + i + '_' + d.k + '" value="' + (a[d.k] || '') + '" onchange="saveScore(' + i + ',\'' + d.k + '\')" style="width:55px;padding:6px;border-radius:4px;border:1px solid rgba(245,242,236,.12);font-size:var(--font-16);;font-family:var(--sans,Helvetica Neue,sans-serif)"/></div>'
                }).join('') + '</div>' : ''),
                'margin-bottom:12px;border:' + (anyNo ? '1px solid #e8c4c4;background:rgba(155,45,63,.06)' : score !== null ? '1px solid #c0ddd5;background:rgba(27,107,90,.04)' : '1px solid rgba(245,242,236,.06)'))
        })
    }
    return h + '</div></div>'
}

function addNavIdea() {
    var n = val('ni_name');
    if (!n) return;
    if (!data.ideas) data.ideas = [];
    data.ideas.push({
        name: n,
        desc: val('ni_desc'),
        strategic: val('ni_strategic'),
        cost: val('ni_cost'),
        timeframe: val('ni_tf'),
        dept: val('ni_dept'),
        when: 'now'
    });
    UI.addForm = false;
    UI.ni = {
        name: '',
        desc: '',
        strategic: '',
        cost: '',
        timeframe: '',
        dept: '',
        when: 'now'
    };
    saveData();
    render()
}

function advanceFromBluesky(i) {
    if (!data.selected) data.selected = [];
    if (data.selected.indexOf(i) < 0) data.selected.push(i);
    if (!data.projects) data.projects = {};
    if (!data.projects[i]) data.projects[i] = {};
    data.projects[i].viable = true;
    data.projects[i].objectives = (data.ideas || [])[i] ? ((data.ideas || [])[i].strategic || '') : '';
    saveData();
    render()
}

function renderNavExplore() {
    var _w = '<div style="padding-top:110px"><div class="wrap" style="max-width:800px;padding:0 24px 80px">';
    var backH = '<button class="btn-ghost" style="font-size:var(--font-control);padding:7px 14px;margin-bottom:16px" onclick="go(\'phase5\')">\u2190 Pipeline Dashboard</button>';

    var ideas = data.ideas || [],
        proj = data.projects || {},
        as = data.assessments || {},
        stages = getStages();
    var h = _w + '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Exploration Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Complete a full assessment for each project before advancing to Development. Click a card to expand.</p>';
    h += pipeViz('explore', NAV_MAP);
    if (stages.explore.length === 0) {
        h += card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">No projects in Exploration. Advance ideas from Blue Sky first.</p></div>');
        return h
    }
    stages.explore.forEach(function(i) {
        var idea = ideas[i],
            p = proj[i] || {};
        var assessed = !!(p.objectives && p.assessed);
        var isOpen = UI.expanded[i];
        h += card('<div style="display:flex;justify-content:space-between;align-items:center"><div style="flex:1"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><h4 style="font-size:15px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + (assessed ? badge('Assessed \u2713', '#1B6B5A') : badge('Needs Assessment', '#2D5A8E')) + '</div><div style="font-size:var(--font-16);color:#8A8278">' + esc(p.objectives || (idea ? idea.strategic : '') || 'No objectives set') + '</div></div><div style="display:flex;gap:8px;align-items:center">' + (assessed ? btn('Advance \u2192', 'advanceToDevFromExplore(' + i + ')', 'bp', 'font-size:var(--font-readable-sm);padding:4px 12px;background:#2D5A8E') : '') + btn(isOpen ? '\u25be Collapse' : '\u25b8 Full Assessment', 'UI.expanded[' + i + ']=!UI.expanded[' + i + '];render()', 'bg2', 'font-size:var(--font-16);padding:4px 10px') + '</div></div>' +
            (isOpen ? '<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(245,242,236,.06)"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + ta('Objectives *', 'expl_' + i + '_obj', p.objectives || (idea ? idea.strategic : ''), 'What this project aims to achieve', 2) + ta('Deliverables', 'expl_' + i + '_del', p.deliverables, 'What will be produced', 2) + ta('Timeline', 'expl_' + i + '_tl', p.timeline, 'e.g. Prototype 2mo, Test 1mo', 2) + ta('Resources', 'expl_' + i + '_res', p.resources, 'People, budget, technology', 2) + ta('Key risks', 'expl_' + i + '_risk', p.risks, 'Main risks and concerns', 2) + ta('Success metrics', 'expl_' + i + '_met', p.metrics, 'How we\'ll measure success', 2) + '</div>' +
                '<h4 style="font-size:16px;font-weight:700;margin:16px 0 8px">Gap Analysis</h4><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">' + [{
                    k: 'skills',
                    l: 'Skills'
                }, {
                    k: 'resources',
                    l: 'Resources'
                }, {
                    k: 'technology',
                    l: 'Technology'
                }].map(function(g) {
                    return '<div style="padding:12px;background:rgba(245,242,236,.02);border-radius:8px"><div style="font-size:var(--font-16);;font-weight:700;margin-bottom:8px">' + g.l + '</div>' + ta('Have', 'expl_' + i + '_' + g.k + 'H', (p.gap || {})[g.k + 'H'], 'Current...', 1) + ta('Need', 'expl_' + i + '_' + g.k + 'N', (p.gap || {})[g.k + 'N'], 'Required...', 1) + '</div>'
                }).join('') + '</div>' +
                '<h4 style="font-size:16px;font-weight:700;margin:16px 0 8px">SWOT Analysis</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;border-radius:8px;overflow:hidden">' + [{
                    k: 'strengths',
                    l: '+ Strengths',
                    bg: 'rgba(27,107,90,.08)'
                }, {
                    k: 'weaknesses',
                    l: '- Weaknesses',
                    bg: 'rgba(155,45,63,.06)'
                }, {
                    k: 'opportunities',
                    l: '? Opportunities',
                    bg: 'rgba(45,90,142,.08)'
                }, {
                    k: 'threats',
                    l: '? Threats',
                    bg: 'rgba(139,94,60,.08)'
                }].map(function(q) {
                    return '<div style="background:' + q.bg + ';padding:12px"><div style="font-size:var(--font-16);;font-weight:700;margin-bottom:6px">' + q.l + '</div><textarea id="expl_' + i + '_sw_' + q.k + '" rows="2" style="width:100%;padding:8px;border:1px solid rgba(245,242,236,.12);border-radius:6px;font-size:var(--font-16);font-family:var(--sans,Helvetica Neue,sans-serif);box-sizing:border-box;background:rgba(245,242,236,.06);color:var(--paper)">' + esc((p.swot || {})[q.k]) + '</textarea></div>'
                }).join('') + '</div>' +
                '<h4 style="font-size:16px;font-weight:700;margin:16px 0 8px">Partnerships</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + ta('Internal', 'expl_' + i + '_pI', p.partInt, 'e.g. IT for integration', 2) + ta('External', 'expl_' + i + '_pE', p.partExt, 'e.g. AI vendor, consultant', 2) + '</div>' +
                '<div style="margin-top:16px;padding-top:12px;border-top:2px solid #eee;display:flex;justify-content:space-between;align-items:center">' + (!assessed ? btn('\u2713 Mark Assessment Complete', 'saveExploreAssessment(' + i + ')', 'bs', 'font-size:var(--font-16);') : btn('Advance to Development \u2192', 'advanceToDevFromExplore(' + i + ')', 'bp', 'font-size:var(--font-16);;background:#2D5A8E')) + '</div></div>' : ''),
            'margin-bottom:12px;border-left:' + (assessed ? '4px solid #1B6B5A' : '4px solid #2D5A8E'))
    });
    return h + '</div></div>'
}

function saveExploreAssessment(i) {
    ['obj', 'del', 'tl', 'res', 'risk', 'met'].forEach(function(f) {
        var k = {
            obj: 'objectives',
            del: 'deliverables',
            tl: 'timeline',
            res: 'resources',
            risk: 'risks',
            met: 'metrics'
        } [f];
        updNested('projects', i, k, val('expl_' + i + '_' + f))
    });
    ['skills', 'resources', 'technology'].forEach(function(g) {
        var gap = (data.projects[i] || {}).gap || {};
        gap[g + 'H'] = val('expl_' + i + '_' + g + 'H');
        gap[g + 'N'] = val('expl_' + i + '_' + g + 'N');
        updNested('projects', i, 'gap', gap)
    });
    var sw = {};
    ['strengths', 'weaknesses', 'opportunities', 'threats'].forEach(function(k) {
        sw[k] = val('expl_' + i + '_sw_' + k)
    });
    updNested('projects', i, 'swot', sw);
    updNested('projects', i, 'partInt', val('expl_' + i + '_pI'));
    updNested('projects', i, 'partExt', val('expl_' + i + '_pE'));
    updNested('projects', i, 'assessed', true);
    render()
}

function advanceToDevFromExplore(i) {
    if (!data.expSelected) data.expSelected = [];
    if (data.expSelected.indexOf(i) < 0) data.expSelected.push(i);
    saveData();
    render()
}

function renderNavDevelop() {
    var _w = '<div style="padding-top:110px"><div class="wrap" style="max-width:800px;padding:0 24px 80px">';
    var backH = '<button class="btn-ghost" style="font-size:var(--font-control);padding:7px 14px;margin-bottom:16px" onclick="go(\'phase5\')">\u2190 Pipeline Dashboard</button>';

    var ideas = data.ideas || [],
        stages = getStages(),
        exp = data.experiments || {},
        trk = data.tracking || {};
    var h = _w + '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Development Portfolio</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Design experiments, track progress, and launch completed projects to Operational.</p>';
    h += pipeViz('experiment', NAV_MAP);
    if (stages.experiment.length === 0) {
        h += card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">No experiments in Development. Advance projects from Exploration first.</p></div>');
        return h
    }
    stages.experiment.forEach(function(i) {
        var idea = ideas[i],
            e = exp[i] || {},
            tr = trk[i] || {};
        var done = tr.status === 'complete';
        h += card('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4 style="font-size:15px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4>' + sel('', 'ndev_' + i + '_st', tr.status, [{
                v: '',
                l: 'Set status...'
            }, {
                v: 'running',
                l: '? Running'
            }, {
                v: 'paused',
                l: '? Paused'
            }, {
                v: 'complete',
                l: '? Complete'
            }, {
                v: 'killed',
                l: 'Killed'
            }]) + '</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + ta('Owner', 'ndev_' + i + '_ow', e.owner, 'e.g. Sarah Kim', 1) + ta('Success metric', 'ndev_' + i + '_sm', e.successMetric, 'e.g. Quote turnaround < 4 hours', 1) + ta('Budget', 'ndev_' + i + '_bu', e.budget, 'e.g. $15,000', 1) + ta('Timeline', 'ndev_' + i + '_tl', e.timeline, 'e.g. 4 weeks', 1) + '</div>' + ta('Results & learnings', 'ndev_' + i + '_res', tr.results, 'Log results, learnings, what works and what doesn\'t...', 3) +
            '<div style="margin-top:12px;padding-top:12px;border-top:2px solid #eee">' + (done ? btn('Launch to Operational Portfolio', 'launchFromDev(' + i + ')', 'bp', 'width:100%;padding:14px;font-size:16px;background:#1B6B5A') : tr.status === 'killed' ? '<div style="padding:12px;background:rgba(155,45,63,.06);border-radius:8px;text-align:center"><span style="font-size:var(--font-16);;color:#9B2D3F;font-weight:600">Experiment killed</span></div>' : tr.status ? '<div style="padding:12px;background:#f5f5f0;border-radius:8px;text-align:center"><span style="font-size:var(--font-16);;color:#8B5E3C">Set status to "Complete" when ready to launch.</span></div>' : '<div style="padding:12px;background:rgba(245,242,236,.02);border-radius:8px;text-align:center"><span style="font-size:var(--font-16);;color:rgba(138,130,120,.5)">Set a status to begin tracking.</span></div>') + '</div>', 'margin-bottom:16px;border-left:' + (done ? '4px solid #1B6B5A' : '4px solid #8B5E3C'))
    });
    return h + '</div></div>'
}

function saveNavDevFields(i) {
    ['ow', 'sm', 'bu', 'tl'].forEach(function(f) {
        var k = {
            ow: 'owner',
            sm: 'successMetric',
            bu: 'budget',
            tl: 'timeline'
        } [f];
        updNested('experiments', i, k, val('ndev_' + i + '_' + f))
    });
    updNested('tracking', i, 'status', val('ndev_' + i + '_st'));
    updNested('tracking', i, 'results', val('ndev_' + i + '_res'))
}

function launchFromDev(i) {
    var stages = getStages();
    stages.experiment.forEach(function(j) {
        saveNavDevFields(j)
    });
    if (!data.launched) data.launched = [];
    if (data.launched.indexOf(i) < 0) data.launched.push(i);
    saveData();
    render()
}

function renderLaunchProj() {
    var _w = '<div style="padding-top:110px"><div class="wrap" style="max-width:800px;padding:0 24px 80px">';
    var backH = '<button class="btn-ghost" style="font-size:var(--font-control);padding:7px 14px;margin-bottom:16px" onclick="go(\'phase5\')">\u2190 Pipeline Dashboard</button>';

    var ideas = data.ideas || [],
        stages = getStages(),
        trk = data.tracking || {},
        exp = data.experiments || {},
        as = data.assessments || {},
        launched = data.launched || [];
    var devP = stages.experiment;
    var h = _w + '<h2 style="font-size:22px;font-weight:600;margin:0 0 4px">Launch Project to Operational</h2><p style="color:#8A8278;margin:8px 0 20px;line-height:1.6;font-size:16px">Review experiment results and stage-gate milestones. Advance completed projects.</p>';
    if (!devP.length) {
        h += card('<div style="text-align:center;padding:48px"><p style="color:rgba(138,130,120,.5)">No projects currently in Development.</p></div>');
        return h
    }
    devP.forEach(function(i) {
        var idea = ideas[i],
            tr = trk[i] || {},
            e = exp[i] || {};
        var isL = launched.indexOf(i) >= 0;
        h += card('<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px"><div><h4 style="font-size:15px;font-weight:700;margin:0">' + esc(idea ? idea.name : '') + '</h4><div style="display:flex;gap:8px;margin-top:4px">' + (tr.status ? badge(tr.status, tr.status === 'complete' ? '#1B6B5A' : tr.status === 'running' ? '#2D5A8E' : 'rgba(138,130,120,.5)') : '') + (e.successMetric ? '<span style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.7)">Metric: ' + esc(e.successMetric) + '</span>' : '') + '</div></div><div style="text-align:center;min-width:50px"><div style="font-size:18px;font-weight:600;color:#8B5E3C">' + getScore(i) + '</div><div style="font-size:var(--font-control);color:rgba(138,130,120,.5)">/50</div></div></div>' +
            (tr.results ? '<div style="padding:12px;background:rgba(245,242,236,.02);border-radius:8px;margin-bottom:12px"><div style="font-size:var(--font-readable-sm);font-weight:600;color:rgba(138,130,120,.7);margin-bottom:4px">RESULTS</div><p style="font-size:var(--font-16);;color:#d4cfca;margin:0">' + esc(tr.results) + '</p></div>' : '') +
            (e.milestone ? '<div style="font-size:var(--font-16);color:#8A8278;margin-bottom:12px"><strong>Milestone:</strong> ' + esc(e.milestone) + '</div>' : '') +
            '<div style="display:flex;gap:12px"><button onclick="doLaunch(' + i + ')"' + (isL || tr.status !== 'complete' ? ' disabled' : '') + ' style="flex:1;padding:14px;border-radius:8px;font-size:16px;font-weight:700;cursor:' + (isL || tr.status !== 'complete' ? 'not-allowed' : 'pointer') + ';font-family:var(--sans,Helvetica Neue,sans-serif);opacity:' + (isL || tr.status !== 'complete' ? .5 : 1) + ';border:' + (isL ? '2px solid #1B6B5A' : '1px solid #1B6B5A') + ';background:' + (isL ? '#1B6B5A' : 'rgba(245,242,236,.03)') + ';color:' + (isL ? 'rgba(245,242,236,.03)' : '#1B6B5A') + '">' + (isL ? '\u2713 Launched to Operational' : 'Launch to Operational') + '</button><button onclick="killFromLaunch(' + i + ')" style="padding:14px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;font-family:var(--sans,Helvetica Neue,sans-serif);border:1px solid #9B2D3F;background:rgba(245,242,236,.03);color:#9B2D3F">Kill</button></div>' +
            (tr.status !== 'complete' && !isL ? '<p style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.5);margin-top:8px">Project must have "Complete" status before launching.</p>' : ''), 'margin-bottom:16px;border-left:' + (tr.status === 'complete' ? '4px solid #1B6B5A' : '4px solid rgba(245,242,236,.12)'))
    });
    return h + '</div></div>'
}

function doLaunch(i) {
    if (!data.launched) data.launched = [];
    if (data.launched.indexOf(i) < 0) data.launched.push(i);
    saveData();
    render()
}

function killFromLaunch(i) {
    data.expSelected = (data.expSelected || []).filter(function(x) {
        return x !== i
    });
    saveData();
    render()
}
// === VISUALIZATION FUNCTIONS ===

function vizTimeline(currentPhase) {
    var ranges = [{
        id: 1,
        start: 0,
        end: 30,
        name: 'Diagnose',
        color: '#1B6B5A'
    }, {
        id: 2,
        start: 31,
        end: 50,
        name: 'Organize',
        color: '#2D5A8E'
    }, {
        id: 3,
        start: 51,
        end: 65,
        name: 'Prepare',
        color: '#8B5E3C'
    }, {
        id: 4,
        start: 66,
        end: 90,
        name: 'Ignite',
        color: '#9B2D3F'
    }];
    var sd = new Date(data.startDate || new Date().toISOString().split('T')[0]);
    var today = new Date();
    var daysSince = Math.max(0, Math.floor((today - sd) / (1000 * 60 * 60 * 24)));
    var progress = Math.min(100, Math.max(0, (daysSince / 90) * 100));
    var phProg = function(pid) {
        var p = PH.find(function(x) {
            return x.id === pid
        });
        if (!p) return 0;
        var d = p.steps.filter(function(s) {
            return isStepDone(s.id)
        }).length;
        return p.steps.length ? Math.round(d / p.steps.length * 100) : 0
    };
    var h = '<div style="margin-bottom:24px"><div style="background:rgba(245,242,236,.03);border:1px solid rgba(245,242,236,.06);border-radius:10px;padding:16px 20px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--font-16)"><div style="font-size:var(--font-16);font-weight:700;color:rgba(138,130,120,.7);text-transform:uppercase;letter-spacing:1px">90-Day Timeline</div><div style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.7)">Day ' + Math.min(90, daysSince) + ' of 90</div></div>';
    h += '<div style="display:flex;margin-bottom:6px">';
    ranges.forEach(function(p) {
        var w = ((p.end - p.start) / 90) * 100;
        h += '<div onclick="go(\'phase-' + p.id + '\')" style="width:' + w + '%;text-align:center;cursor:pointer;padding:2px 0"><div style="font-size:18px;margin-bottom:10px; font-weight:500;color:' + (currentPhase === p.id ? p.color : 'var(--paper)') + '">' + p.name + '</div><div style="font-size:var(--font-label);color:rgba(138,130,120,.4)">Days ' + (p.start === 0 ? 1 : p.start) + '\u2013' + p.end + '</div></div>'
    });
    h += '</div><div style="position:relative;height:10px;margin-bottom:6px;background:rgba(245,242,236,.04);border-radius:5px">';
    ranges.forEach(function(p) {
        var left = (p.start / 90) * 100;
        var w = ((p.end - p.start) / 90) * 100;
        var pp = phProg(p.id);
        h += '<div style="position:absolute;top:0;left:' + left + '%;width:' + w + '%;height:10px;border-radius:' + (p.id === 1 ? '5px 0 0 5px' : p.id === 4 ? '0 5px 5px 0' : '0') + '"><div style="height:100%;width:' + pp + '%;background:' + p.color + ';border-radius:' + (p.id === 1 ? '5px 0 0 5px' : p.id === 4 && pp === 100 ? '0 5px 5px 0' : '0') + ';transition:width .3s"></div></div>'
    });
    h += '<div style="position:absolute;top:-3px;left:' + progress + '%;width:3px;height:16px;background:#333;border-radius:2px;z-index:3;transition:left .3s"></div></div>';
    h += '<div style="display:flex">';
    ranges.forEach(function(p) {
        var w = ((p.end - p.start) / 90) * 100;
        var pp = phProg(p.id);
        h += '<div onclick="go(\'phase-' + p.id + '\')" style="width:' + w + '%;text-align:center;cursor:pointer;padding:2px 0"><div style="font-size:var(--font-control);color:' + (pp === 100 ? '#1B6B5A' : 'rgba(138,130,120,.7)') + ';font-weight:' + (pp === 100 ? 700 : 400) + '">' + pp + '%</div></div>'
    });
    h += '</div></div></div>';
    return h
}

function vizRadar() {
    var cu = data.culture || {},
        k = data.knowledge || {},
        de = data.decisions || {};
    var cuVals = [cu.uncertainty, cu.aiLegitimacy, cu.failureTolerance, cu.crossFunc, cu.resourceWill, cu.overall].filter(function(v) {
        return typeof v === 'number'
    });
    var kVals = [k.usage, k.awareness, k.resources, k.learning].filter(function(v) {
        return typeof v === 'number'
    });
    var qs = ['q1', 'q2', 'q3', 'q4', 'q5'];
    var answered = qs.filter(function(q) {
        return de[q] && de[q].who
    }).length;
    var axes = [{
        label: 'Innovation Culture',
        value: cuVals.length ? (cuVals.reduce(function(a, b) {
            return a + b
        }, 0) / cuVals.length) : 0
    }, {
        label: 'AI Readiness',
        value: kVals.length ? (kVals.reduce(function(a, b) {
            return a + b
        }, 0) / kVals.length) : 0
    }, {
        label: 'Decision Agility',
        value: answered
    }];
    if (axes.every(function(a) {
            return a.value === 0
        })) return '';
    var cx = 150,
        cy = 130,
        R = 90,
        n = 3,
        maxV = [5, 5, 5],
        PI = Math.PI;
    var pts = axes.map(function(a, i) {
        var angle = (PI * 2 * i / n) - PI / 2;
        var r = R * (a.value / maxV[i]);
        return {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
            lx: cx + (R + 22) * Math.cos(angle),
            ly: cy + (R + 22) * Math.sin(angle),
            v: a.value,
            m: maxV[i],
            l: a.label
        }
    });
    var svg = '<svg viewBox="0 0 300 260" style="width:100%;max-width:360px;display:block;margin:0 auto">';
    [1, 2, 3, 4, 5].forEach(function(lv) {
        var gp = axes.map(function(_, i) {
            var angle = (PI * 2 * i / n) - PI / 2;
            var r = R * (lv / 5);
            return (cx + r * Math.cos(angle)) + ',' + (cy + r * Math.sin(angle))
        }).join(' ');
        svg += '<polygon points="' + gp + '" fill="none" stroke="rgba(245,242,236,.08)" stroke-width="1"/>'
    });
    axes.forEach(function(_, i) {
        var angle = (PI * 2 * i / n) - PI / 2;
        svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.cos(angle)) + '" y2="' + (cy + R * Math.sin(angle)) + '" stroke="rgba(245,242,236,.08)" stroke-width="1"/>'
    });
    svg += '<polygon points="' + pts.map(function(p) {
        return p.x + ',' + p.y
    }).join(' ') + '" fill="#1B6B5A30" stroke="#1B6B5A" stroke-width="2"/>';
    pts.forEach(function(p) {
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#1B6B5A"/>'
    });
    pts.forEach(function(p) {
        svg += '<text x="' + p.lx + '" y="' + p.ly + '" text-anchor="middle" font-size="10" font-weight="600" fill="#8A8278" font-family="Helvetica Neue,Arial,sans-serif">' + p.l + '</text><text x="' + p.lx + '" y="' + (p.ly + 12) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#1B6B5A" font-family="Helvetica Neue,Arial,sans-serif">' + (typeof p.v === 'number' ? p.v.toFixed(1) : p.v) + '/' + p.m + '</text>'
    });
    svg += '</svg>';
    return card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">Assessment Profile</h3>' + svg, 'margin-top:20px;padding:20px')
}

function vizIdeas() {
    var ideas = data.ideas || [];
    if (!ideas.length) return '';
    var now = ideas.map(function(idea, i) {
        return {
            name: idea.name,
            when: idea.when,
            idx: i
        }
    }).filter(function(x) {
        return x.when === 'now'
    });
    var future = ideas.map(function(idea, i) {
        return {
            name: idea.name,
            when: idea.when,
            idx: i
        }
    }).filter(function(x) {
        return x.when !== 'now'
    });
    var depts = {};
    ideas.forEach(function(i) {
        var d = i.dept || 'Unassigned';
        depts[d] = (depts[d] || 0) + 1
    });
    var h = '<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">Ideas Landscape</h3><div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;padding:16px 0"><div style="text-align:center"><div style="font-size:18px;font-weight:700;color:#1B6B5A;text-transform:uppercase;letter-spacing:1px;margin-bottom:15px">Now (' + now.length + ')</div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">';
    now.forEach(function(idea) {
        var nm = (idea.name || '').length > 16 ? (idea.name || '').substring(0, 14) + '\u2026' : idea.name;
        h += '<div onclick="UI.ec=' + idea.idx + ';UI.sf=true;render()" style="width:72px;padding:8px;border-radius:8px;border:2px solid #1B6B5A;background:rgba(27,107,90,.06);text-align:center;cursor:pointer"><div style="font-size:16px;margin-bottom:2px">&#9679;</div><div style="font-size:var(--font-label);font-weight:600;color:#d4cfca;line-height:1.2">' + esc(nm) + '</div></div>'
    });
    h += '</div></div>';
    if (future.length > 0) {
        h += '<div style="text-align:center"><div style="font-size:18px;font-weight:700;color:#2D5A8E;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Future (' + future.length + ')</div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">';
        future.forEach(function(idea) {
            var nm = (idea.name || '').length > 16 ? (idea.name || '').substring(0, 14) + '\u2026' : idea.name;
            h += '<div onclick="UI.ec=' + idea.idx + ';UI.sf=true;render()" style="width:72px;padding:8px;border-radius:8px;border:2px solid #2D5A8E;background:rgba(45,90,142,.06);text-align:center;cursor:pointer"><div style="font-size:16px;margin-bottom:2px">&#9679;</div><div style="font-size:var(--font-label);font-weight:600;color:#d4cfca;line-height:1.2">' + esc(nm) + '</div></div>'
        });
        h += '</div></div>'
    }
    h += '</div><div style="display:flex;justify-content:center;gap:12px;font-size:var(--font-control);color:rgba(138,130,120,.7);flex-wrap:wrap">';
    Object.keys(depts).forEach(function(d) {
        h += '<span><strong>' + esc(d) + ':</strong> ' + depts[d] + '</span>'
    });
    h += '</div>';
    return card(h, 'margin-top:20px')
}

function vizScores() {
    var ideas = data.ideas || [],
        as = data.assessments || {};
    if (!ideas.length) return '';
    var scored = ideas.map(function(idea, i) {
        var a = as[i] || {};
        var feasible = a.techCapable && a.resourcesAvailable && a.culturalFit && a.purposeAligned && a.affordable;
        var score = feasible ? getScore(i) : null;
        var disq = a.techCapable !== undefined && !feasible;
        return {
            name: idea.name || 'Idea ' + (i + 1),
            score: score,
            disq: disq
        }
    }).filter(function(s) {
        return s.score !== null || s.disq
    }).sort(function(a, b) {
        return (b.score || 0) - (a.score || 0)
    });
    if (!scored.length) return '';
    var maxS = 50,
        W = 460,
        barH = 20,
        pad = 120,
        H = Math.max(160, scored.length * 28 + 60);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:500px;display:block;margin:0 auto">';
    scored.forEach(function(s, i) {
        var y = 30 + i * (barH + 8);
        var w = s.score !== null ? (s.score / maxS) * (W - pad - 20) : 0;
        var c = s.disq ? '#9B2D3F' : s.score >= 35 ? '#1B6B5A' : s.score >= 20 ? '#2D5A8E' : '#8B5E3C';
        var nm = s.name.length > 14 ? s.name.substring(0, 12) + '\u2026' : s.name;
        svg += '<text x="' + (pad - 8) + '" y="' + (y + barH / 2 + 4) + '" text-anchor="end" font-size="10" fill="#8A8278" font-family="Helvetica Neue,Arial,sans-serif">' + esc(nm) + '</text>';
        if (s.disq) {
            svg += '<rect x="' + pad + '" y="' + y + '" width="' + (W - pad - 20) + '" height="' + barH + '" fill="rgba(155,45,63,.06)" rx="3"/><text x="' + (pad + 8) + '" y="' + (y + barH / 2 + 4) + '" font-size="10" fill="#9B2D3F" font-family="Helvetica Neue,Arial,sans-serif" font-weight="600">Disqualified</text>'
        } else {
            svg += '<rect x="' + pad + '" y="' + y + '" width="' + (W - pad - 20) + '" height="' + barH + '" fill="rgba(245,242,236,.06)" rx="3"/><rect x="' + pad + '" y="' + y + '" width="' + w + '" height="' + barH + '" fill="' + c + '40" stroke="' + c + '" stroke-width="1" rx="3"/><text x="' + (pad + w + 6) + '" y="' + (y + barH / 2 + 4) + '" font-size="11" fill="' + c + '" font-family="Helvetica Neue,Arial,sans-serif" font-weight="700">' + s.score + '/50</text>'
        }
    });
    svg += '</svg>';
    return card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">FIRST Score Distribution</h3>' + svg, 'margin-top:20px')
}

function vizOwnership() {
    var ow = data.ownership || {},
        leads = ow.leads || [];
    var checks = [{
        l: 'Pipeline Owner',
        done: !!ow.ownerName
    }, {
        l: 'Owner Role',
        done: !!ow.ownerRole
    }, {
        l: 'Authority Scope',
        done: !!ow.authority
    }, {
        l: 'Embedded Lead 1',
        done: leads.length >= 1 && leads[0] && !!leads[0].name
    }, {
        l: 'Embedded Lead 2',
        done: leads.length >= 2 && leads[1] && !!leads[1].name
    }];
    var filled = checks.filter(function(c) {
        return c.done
    }).length;
    if (filled === 0) return '';
    var cx = 140,
        cy = 120,
        R = 65,
        n = 5,
        PI = Math.PI;
    var svg = '<svg viewBox="0 0 280 250" style="width:100%;max-width:300px;display:block;margin:0 auto"><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="rgba(245,242,236,.08)" stroke-width="2"/>';
    checks.forEach(function(p, i) {
        var angle = (PI * 2 * i / n) - PI / 2;
        var x = cx + R * Math.cos(angle),
            y = cy + R * Math.sin(angle);
        var lx = cx + (R + 30) * Math.cos(angle),
            ly = cy + (R + 30) * Math.sin(angle);
        var anchor = Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle';
        var lxA = anchor === 'start' ? lx + 2 : anchor === 'end' ? lx - 2 : lx;
        svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="rgba(245,242,236,.08)" stroke-width="1"/>';
        svg += '<circle cx="' + x + '" cy="' + y + '" r="' + (p.done ? 9 : 7) + '" fill="' + (p.done ? '#1B6B5A' : 'rgba(245,242,236,.06)') + '" stroke="' + (p.done ? '#1B6B5A' : '#ccc') + '" stroke-width="2"/>';
        if (p.done) svg += '<text x="' + x + '" y="' + (y + 3) + '" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">\u2713</text>';
        svg += '<text x="' + lxA + '" y="' + (Math.sin(angle) < -0.3 ? ly - 2 : ly + 4) + '" text-anchor="' + anchor + '" font-size="9" font-weight="600" fill="' + (p.done ? '#1B6B5A' : 'rgba(138,130,120,.5)') + '" font-family="Helvetica Neue,Arial,sans-serif">' + p.l + '</text>'
    });
    svg += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="24" font-weight="800" fill="#1B6B5A" font-family="Helvetica Neue,Arial,sans-serif">' + filled + '</text><text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="11" fill="rgba(138,130,120,.7)" font-family="Helvetica Neue,Arial,sans-serif">of ' + n + '</text></svg>';
    return card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">Ownership Completeness</h3>' + svg, 'margin-top:20px')
}

function vizProjectReady() {
    var sel = data.selected || [],
        proj = data.projects || {};
    if (!sel.length) return '';
    var goC = sel.filter(function(i) {
        return (proj[i] || {}).viable === true
    }).length;
    var noC = sel.filter(function(i) {
        return (proj[i] || {}).viable === false
    }).length;
    var penC = sel.filter(function(i) {
        return (proj[i] || {}).viable === undefined
    }).length;
    var t = sel.length;
    return card('<h3 style="font-size:17px;font-weight:700;margin:0 0 12px">Project Assessment Summary</h3><div style="display:flex;gap:12px;margin-bottom:12px"><div style="flex:1;text-align:center;padding:12px;background:rgba(27,107,90,.06);border-radius:8px;border:1px solid rgba(27,107,90,.3)"><div style="font-size:24px;font-weight:600;color:#1B6B5A">' + goC + '</div><div style="font-size:var(--font-control);color:#1B6B5A;font-weight:600">Go</div></div><div style="flex:1;text-align:center;padding:12px;background:rgba(155,45,63,.06);border-radius:8px;border:1px solid rgba(155,45,63,.2)"><div style="font-size:24px;font-weight:600;color:#9B2D3F">' + noC + '</div><div style="font-size:var(--font-control);color:#9B2D3F;font-weight:600">No Go</div></div><div style="flex:1;text-align:center;padding:12px;background:rgba(245,242,236,.02);border-radius:8px;border:1px solid rgba(245,242,236,.06)"><div style="font-size:24px;font-weight:600;color:rgba(138,130,120,.7)">' + penC + '</div><div style="font-size:var(--font-control);color:rgba(138,130,120,.7);font-weight:600">Pending</div></div></div><div style="height:8px;background:rgba(245,242,236,.04);border-radius:4px;overflow:hidden;display:flex">' + (goC ? '<div style="width:' + ((goC / t) * 100) + '%;background:#1B6B5A;height:100%"></div>' : '') + (noC ? '<div style="width:' + ((noC / t) * 100) + '%;background:#9B2D3F;height:100%"></div>' : '') + (penC ? '<div style="width:' + ((penC / t) * 100) + '%;background:rgba(245,242,236,.12);height:100%"></div>' : '') + '</div>', 'margin-top:20px')
}

function vizHorizon() {
    var port = data.portfolio || {},
        stages = getStages(),
        goP = stages.explore;
    if (!goP.length) return '';
    var qk = goP.filter(function(i) {
        return (port[i] || {}).horizon === 'quick'
    }).length;
    var md = goP.filter(function(i) {
        return (port[i] || {}).horizon === 'medium'
    }).length;
    var lg = goP.filter(function(i) {
        return (port[i] || {}).horizon === 'long'
    }).length;
    var un = goP.filter(function(i) {
        return !(port[i] || {}).horizon
    }).length;
    var total = goP.length,
        W = 400,
        H = 200,
        pad = 30,
        barW = 80,
        gap = 30;
    var bars = [{
        l: 'Quick Wins',
        c: qk,
        cl: '#1B6B5A',
        x: pad
    }, {
        l: 'Medium-term',
        c: md,
        cl: '#2D5A8E',
        x: pad + barW + gap
    }, {
        l: 'Long-term',
        c: lg,
        cl: '#8B5E3C',
        x: pad + 2 * (barW + gap)
    }];
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:420px;display:block;margin:0 auto">';
    bars.forEach(function(b) {
        var maxH = H - 60;
        var bh = total > 0 ? (b.c / total) * maxH : 0;
        svg += '<rect x="' + b.x + '" y="' + (H - 30 - bh) + '" width="' + barW + '" height="' + bh + '" fill="' + b.cl + '30" stroke="' + b.cl + '" stroke-width="2" rx="4"/><text x="' + (b.x + barW / 2) + '" y="' + (H - 30 - bh - 8) + '" text-anchor="middle" font-size="16" font-weight="800" fill="' + b.cl + '" font-family="Helvetica Neue,Arial,sans-serif">' + b.c + '</text><text x="' + (b.x + barW / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" font-weight="600" fill="var(--stone)" font-family="Helvetica Neue,Arial,sans-serif">' + b.l + '</text>'
    });
    svg += '</svg>';
    return card('<h3 style="font-size:17px;font-weight:700;margin:0 0 4px">Portfolio Balance</h3><p style="font-size:var(--font-16);color:rgba(138,130,120,.7);margin-bottom:12px">Distribution across time horizons.</p>' + svg + (un ? '<div style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.5);text-align:center;margin-top:4px">' + un + ' project' + (un !== 1 ? 's' : '') + ' without a horizon assigned</div>' : ''), 'margin-top:20px')
}

function vizExpReady() {
    var exp = data.experiments || {},
        exSel = data.expSelected || [],
        ideas = data.ideas || [];
    if (!exSel.length) return '';
    var ready = exSel.filter(function(i) {
        var e = exp[i] || {};
        return e.owner && e.successMetric
    });
    var partial = exSel.filter(function(i) {
        var e = exp[i] || {};
        return (e.owner || e.successMetric) && !(e.owner && e.successMetric)
    });
    var empty = exSel.filter(function(i) {
        var e = exp[i] || {};
        return !e.owner && !e.successMetric
    });
    var cols = Math.min(exSel.length, 5);
    var h = '<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Experiment Readiness</h3><div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:8px">';
    exSel.forEach(function(i) {
        var idea = ideas[i],
            e = exp[i] || {};
        var isR = e.owner && e.successMetric;
        var isP = (e.owner || e.successMetric) && !isR;
        var nm = (idea && idea.name || '').length > 16 ? (idea && idea.name || '').substring(0, 14) + '\u2026' : (idea ? idea.name : '');
        h += '<div style="padding:10px;border-radius:8px;border:2px solid ' + (isR ? '#1B6B5A' : isP ? '#D4A017' : 'rgba(245,242,236,.12)') + ';background:' + (isR ? 'rgba(27,107,90,.06)' : isP ? 'rgba(184,137,42,.04)' : 'rgba(245,242,236,.02)') + ';text-align:center;cursor:pointer" onclick="UI.showEx=' + i + ';render()"><div style="font-size:18px">' + (isR ? 'Ready' : isP ? 'Partial' : 'New') + '</div><div style="font-size:var(--font-label);font-weight:600;color:var(--paper);margin-top:4px;line-height:1.2">' + esc(nm) + '</div>' + (isR ? '<div style="font-size:var(--font-readable-xs);color:#1B6B5A;margin-top:2px">Ready</div>' : '') + '</div>'
    });
    h += '</div><div style="display:flex;justify-content:center;gap:12px;font-size:var(--font-control);color:rgba(138,130,120,.7);margin-top:8px"><span>Ready (' + ready.length + ')</span><span>Partial (' + partial.length + ')</span><span>Not started (' + empty.length + ')</span></div>';
    return card(h, 'margin-top:20px')
}

function vizExpStatus() {
    var trk = data.tracking || {},
        exSel = data.expSelected || [],
        ideas = data.ideas || [];
    if (!exSel.length) return '';
    var sts = {
        running: 0,
        paused: 0,
        complete: 0,
        killed: 0,
        unset: 0
    };
    exSel.forEach(function(i) {
        var s = (trk[i] || {}).status;
        if (s) sts[s]++;
        else sts.unset++
    });
    var sC = {
        running: '#1B6B5A',
        paused: '#D4A017',
        complete: '#2D5A8E',
        killed: '#9B2D3F',
        unset: 'rgba(245,242,236,.12)'
    };
    var sI = {
        running: 'Run',
        paused: 'Pause',
        complete: 'Done',
        killed: 'Kill',
        unset: 'New'
    };
    var cols = Math.min(exSel.length, 5);
    var h = '<h3 style="font-size:17px;font-weight:700;margin:0 0 8px">Experiment Status Dashboard</h3><div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:8px;margin-bottom:12px">';
    exSel.forEach(function(i) {
        var idea = ideas[i];
        var s = (trk[i] || {}).status || 'unset';
        var nm = (idea && idea.name || '').length > 16 ? (idea && idea.name || '').substring(0, 14) + '\u2026' : (idea ? idea.name : '');
        h += '<div style="padding:10px;border-radius:8px;border:2px solid ' + sC[s] + ';background:' + (s === 'complete' ? 'rgba(45,90,142,.06)' : s === 'killed' ? 'rgba(155,45,63,.06)' : s === 'running' ? 'rgba(27,107,90,.06)' : 'rgba(245,242,236,.02)') + ';text-align:center"><div style="font-size:18px">' + sI[s] + '</div><div style="font-size:var(--font-label);font-weight:600;color:var(--paper);margin-top:4px;line-height:1.2">' + esc(nm) + '</div></div>'
    });
    h += '</div><div style="height:8px;background:rgba(245,242,236,.04);border-radius:4px;overflow:hidden;display:flex">';
    ['running', 'paused', 'complete', 'killed'].forEach(function(k) {
        if (sts[k] > 0) h += '<div style="width:' + (sts[k] / exSel.length * 100) + '%;background:' + sC[k] + ';height:100%"></div>'
    });
    h += '</div><div style="display:flex;justify-content:center;gap:12px;font-size:var(--font-control);color:rgba(138,130,120,.7);margin-top:8px">';
    ['running', 'paused', 'complete', 'killed', 'unset'].forEach(function(k) {
        if (sts[k] > 0) h += '<span>' + sI[k] + ' ' + k.charAt(0).toUpperCase() + k.slice(1) + ' (' + sts[k] + ')</span>'
    });
    h += '</div>';
    return card(h, 'margin-top:20px')
}
// Pipeline render() removed — master's render() handles routing

// ---------------------------------------
var INSIGHT_FEEDS = [{
        id: 'fastco',
        type: 'article',
        label: 'Fast Company',
        shortLabel: 'Fast Co.',
        color: '#E8A020',
        iconSvg: '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" stroke="currentColor" stroke-width="2"/><text x="16" y="21" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor" font-family="Arial">FC</text></svg>',
        profileUrl: 'https://www.fastcompany.com/user/faisal-hoque',
        rssProxies: [
            'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.fastcompany.com%2Fuser%2Ffaisal-hoque%2Frss.xml&count=8',
            'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Frss.app%2Ffeeds%2FfastcompanyFaisalHoque.xml&count=8'
        ],
        seed: [{
                title: 'Why Right Now Is Exactly the Wrong Time to Stop Innovating',
                date: '2025-03-12',
                url: 'https://www.fastcompany.com/91301426/why-right-now-is-exactly-the-wrong-time-to-stop-innovating',
                excerpt: 'Organizations that pause innovation during turbulence don\'t recover. The companies gaining ground right now are the ones leaning in while others retreat.'
            },
            {
                title: 'The Hidden Cost of AI Without Governance',
                date: '2025-01-28',
                url: 'https://www.fastcompany.com/90994728/ai-without-governance',
                excerpt: 'Deploying AI without accountability isn\'t speed — it\'s liability accumulation at scale. The reckoning always arrives later than the deployment.'
            },
            {
                title: 'Middle Managers Are the Ethical Backbone of AI Deployment',
                date: '2024-11-14',
                url: 'https://www.fastcompany.com/90993000/middle-managers-ai',
                excerpt: 'Senior leaders set direction. Frontline teams execute. Middle managers are the only people who can see both — and that makes them irreplaceable in AI governance.'
            },
            {
                title: 'Saudi Arabia and the New AI Frontier',
                date: '2024-12-10',
                url: 'https://www.fastcompany.com/91210000/saudi-ai-frontier',
                excerpt: 'The Middle East is not catching up to the AI race. In several domains — sovereign AI infrastructure, workforce transformation — it has moved to the front.'
            },
            {
                title: 'The Demand Desert: What AI Job Displacement Really Means',
                date: '2024-10-03',
                url: 'https://www.fastcompany.com/90988000/demand-desert-ai',
                excerpt: 'When AI automates middle-skill work faster than new categories emerge, aggregate demand contracts. We need to name this before we can address it.'
            }
        ]
    },
    {
        id: 'psych',
        type: 'article',
        label: 'Psychology Today',
        shortLabel: 'Psych Today',
        color: '#2E9E7A',
        iconSvg: '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" stroke="currentColor" stroke-width="2"/><text x="16" y="21" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" font-family="Arial">PT</text></svg>',
        profileUrl: 'https://www.psychologytoday.com/us/contributors/faisal-hoque',
        rssProxies: [
            'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.psychologytoday.com%2Fus%2Fcontributors%2Ffaisal-hoque%2Ffeed&count=8'
        ],
        seed: [{
                title: 'Your Next Chapter in the Age of AI',
                date: '2025-02-18',
                url: 'https://www.psychologytoday.com/us/blog/next-chapter/202502/your-next-chapter-in-the-age-of-ai',
                excerpt: 'A six-part personal transformation framework for navigating the most consequential shift of our professional lifetimes — with intention, not just reaction.'
            },
            {
                title: 'The Psychology of Letting Machines Decide',
                date: '2025-01-05',
                url: 'https://www.psychologytoday.com/us/blog/next-chapter/202501/the-psychology-of-letting-machines-decide',
                excerpt: 'When we automate judgment we don\'t save time — we outsource accountability in ways that gradually hollow out human leadership capacity.'
            },
            {
                title: 'Resilience Is Not a Personality Trait',
                date: '2024-11-22',
                url: 'https://www.psychologytoday.com/us/blog/next-chapter/202411/resilience-is-not-a-personality-trait',
                excerpt: 'Organizations that conflate resilience with temperament produce cultures that punish vulnerability rather than building the systems that create real durability.'
            },
            {
                title: 'Why Difficulty Has Value',
                date: '2024-10-08',
                url: 'https://www.psychologytoday.com/us/blog/next-chapter/202410/why-difficulty-has-value',
                excerpt: 'The friction we are so aggressively removing from work and learning is, in many cases, the mechanism through which capability is built. We are optimizing away the struggle that makes us stronger.'
            },
            {
                title: 'Cognitive Diversity Is National Security Infrastructure',
                date: '2024-09-15',
                url: 'https://www.psychologytoday.com/us/blog/next-chapter/202409/cognitive-diversity-national-security',
                excerpt: 'The most complex threats facing organizations — from adversarial AI to systemic failures — require perspectives that monocultures cannot generate. Diversity isn\'t virtue signaling. It\'s structural defense.'
            }
        ]
    },
    {
        id: 'imd',
        type: 'article',
        label: 'IMD Business School',
        shortLabel: 'IMD',
        color: '#4A5C6E',
        iconSvg: '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="3" stroke="currentColor" stroke-width="2"/><text x="16" y="21" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" font-family="Arial">IMD</text></svg>',
        profileUrl: 'https://www.imd.org/search/?q=faisal+hoque',
        rssProxies: [],
        seed: [{
                title: 'The Responsible AI Index: A New Standard for Governance',
                date: '2025-04-01',
                url: 'https://www.imd.org/research-knowledge/innovation/articles/responsible-ai-index/',
                excerpt: 'RAI-X is the first empirically validated benchmark for organizational AI governance maturity — designed for boards and executives, not just technology teams.'
            },
            {
                title: 'AI Innovation Management: From Strategy to Execution',
                date: '2025-02-10',
                url: 'https://www.imd.org/research-knowledge/innovation/articles/ai-innovation-management/',
                excerpt: 'The 90-Day AI Innovation Pipeline, developed with IMD faculty, is a structured path from executive ambition to operational AI capability without burning out the organization.'
            },
            {
                title: 'Middle Management in the Age of AI',
                date: '2024-10-15',
                url: 'https://www.imd.org/research-knowledge/leadership/articles/middle-management-ai/',
                excerpt: 'The most endangered organizational layer is also its most critical ethical circuit breaker. Eliminating it in the name of efficiency may be the most expensive mistake of the AI era.'
            },
            {
                title: 'Building the Governance-Ready Organization',
                date: '2024-08-22',
                url: 'https://www.imd.org/research-knowledge/technology-and-innovation/articles/governance-ready-organization/',
                excerpt: 'Governance is not a compliance checkbox. It is an operating model for responsible scale. Organizations that treat it as the former will be unprepared when it matters most.'
            }
        ]
    },
    {
        id: 'harvard',
        type: 'article',
        label: 'Harvard Business Review',
        shortLabel: 'HBR',
        color: '#C41E3A',
        iconSvg: '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="3" stroke="currentColor" stroke-width="2"/><text x="16" y="21" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" font-family="Arial">HBR</text></svg>',
        profileUrl: 'https://hbr.org/search?term=faisal+hoque',
        rssProxies: [],
        seed: [{
                title: 'OPEN: A Framework for Navigating AI Transformation',
                date: '2024-06-12',
                url: 'https://hbr.org/2024/06/open-framework-ai-transformation',
                excerpt: 'Objectives, People, Ethics/Enablers, Numbers — a four-part architecture for organizations that want to move fast on AI without losing the human elements that make strategy viable.'
            },
            {
                title: 'The CARE Framework for Managing AI Risk',
                date: '2024-03-08',
                url: 'https://hbr.org/2024/03/care-framework-ai-risk',
                excerpt: 'Catastrophize, Assess, Regulate, Exit — four disciplines that turn reactive AI risk management into a proactive governance posture.'
            },
            {
                title: 'Why AI Strategy Fails Without Human Infrastructure',
                date: '2023-11-14',
                url: 'https://hbr.org/2023/11/ai-strategy-human-infrastructure',
                excerpt: 'Every AI transformation that has stalled did so for a human reason — misaligned incentives, missing accountability, or culture that couldn\'t sustain the change.'
            }
        ]
    },
    {
        id: 'mitsloan',
        type: 'article',
        label: 'MIT Sloan Mgmt Review',
        shortLabel: 'MIT SMR',
        color: '#8B0000',
        iconSvg: '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="3" stroke="currentColor" stroke-width="2"/><text x="16" y="22" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor" font-family="Arial">MIT</text></svg>',
        profileUrl: 'https://sloanreview.mit.edu/article/?search=faisal+hoque',
        rssProxies: [],
        seed: [{
                title: 'Building AI Governance Into Organizational DNA',
                date: '2024-09-05',
                url: 'https://sloanreview.mit.edu/article/building-ai-governance-organizational-dna/',
                excerpt: 'Governance that lives only in policy documents dies when pressure arrives. The organizations that sustain responsible AI embed accountability into every process and incentive structure.'
            },
            {
                title: 'The 90-Day AI Innovation Pipeline',
                date: '2024-05-20',
                url: 'https://sloanreview.mit.edu/article/90-day-ai-innovation-pipeline/',
                excerpt: 'A phased operating framework for moving AI from pilot chaos to production discipline — without the false starts that kill most enterprise AI programs in year two.'
            }
        ]
    },
    {
        id: 'linkedin',
        type: 'post',
        label: 'LinkedIn',
        shortLabel: 'LinkedIn',
        color: '#0A66C2',
        iconSvg: '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="5" stroke="currentColor" stroke-width="2"/><text x="16" y="21" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor" font-family="Arial">in</text></svg>',
        profileUrl: 'https://www.linkedin.com/in/faisalhoque',
        rssProxies: [
            'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Frss.app%2Ffeeds%2FlinkedinFaisalHoque.xml&count=8'
        ],
        seed: [{
                title: 'Twenty Seconds to Kill',
                date: '2025-03-28',
                url: 'https://www.linkedin.com/pulse/twenty-seconds-kill-faisal-hoque',
                excerpt: 'The autonomous weapons debate isn\'t really about weapons. It\'s about whether we are prepared to remove humans from the moral chain of command — permanently and by design.'
            },
            {
                title: 'The AI Governance Failure Nobody Is Talking About',
                date: '2025-03-10',
                url: 'https://www.linkedin.com/pulse/ai-governance-failure-nobody-talking-faisal-hoque',
                excerpt: 'We keep asking whether AI is safe. We rarely ask whether the organizations deploying it are governed well enough to use it responsibly at scale.'
            },
            {
                title: 'Why the Middle Is Where Ethics Lives',
                date: '2025-02-20',
                url: 'https://www.linkedin.com/pulse/why-middle-where-ethics-lives-faisal-hoque',
                excerpt: 'Senior leadership sets direction. Frontline teams act. Middle managers are the only people who see both simultaneously — and that dual visibility is an irreplaceable ethical function.'
            },
            {
                title: 'AI as a New Life Form',
                date: '2025-01-15',
                url: 'https://www.linkedin.com/pulse/ai-new-life-form-faisal-hoque',
                excerpt: 'We keep forcing AI into the categories we already have — tool, threat, partner. What if it is genuinely new? What would that mean for how we govern, deploy, and relate to it?'
            },
            {
                title: 'The Kidnapper\'s Ransom Problem',
                date: '2024-12-18',
                url: 'https://www.linkedin.com/pulse/kidnappers-ransom-problem-faisal-hoque',
                excerpt: 'Organizations are paying operational ransoms to AI they don\'t understand, can\'t audit, and can\'t exit. This is not a technology problem. It is a governance failure.'
            }
        ]
    },
    {
        id: 'convergence',
        type: 'podcast',
        label: 'CONVERGENCE Podcast',
        shortLabel: 'Podcast',
        color: '#C96838',
        iconSvg: '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2"/><polygon points="13,10 24,16 13,22" fill="currentColor"/></svg>',
        profileUrl: 'https://www.buzzsprout.com/convergence',
        rssProxies: [
            'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.buzzsprout.com%2F2361658.rss&count=10',
            'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fanchor.fm%2Fs%2Fconvergence%2Fpodcast%2Frss&count=10'
        ],
        seed: [{
                title: 'AI as a New Life Form — with Lauren Hawker Zafer',
                date: '2025-03-20',
                url: 'https://www.buzzsprout.com/convergence',
                excerpt: 'What if AI isn\'t a tool or a threat — but something genuinely new? Faisal and Lauren explore the philosophical and practical stakes of that framing for leaders and organizations.',
                duration: '48 min'
            },
            {
                title: 'The Demand Desert — Job Displacement in the Age of AI',
                date: '2025-02-14',
                url: 'https://www.buzzsprout.com/convergence',
                excerpt: 'When AI automates middle-skill work faster than new job categories emerge, aggregate demand contracts. Faisal and Lauren map what\'s happening and what leadership can do about it.',
                duration: '52 min'
            },
            {
                title: 'Agentic Enterprise — When AI Acts Without Asking',
                date: '2025-01-30',
                url: 'https://www.buzzsprout.com/convergence',
                excerpt: 'Agentic AI doesn\'t just answer questions — it initiates, delegates, and completes multi-step tasks. That changes everything about governance, accountability, and organizational trust.',
                duration: '44 min'
            },
            {
                title: 'The Governance Gap — Why Policy Lags Deployment',
                date: '2024-12-12',
                url: 'https://www.buzzsprout.com/convergence',
                excerpt: 'Regulation moves in years. AI deployment moves in weeks. The space between is where organizations either build responsible practices or accumulate invisible risk.',
                duration: '39 min'
            },
            {
                title: 'Human Infrastructure — The Underrated Variable in AI Success',
                date: '2024-11-08',
                url: 'https://www.buzzsprout.com/convergence',
                excerpt: 'Culture, incentives, accountability structures — the human operating system that AI runs on top of. Every failed AI program failed here first, not in the model.',
                duration: '55 min'
            }
        ]
    }
];

var insightsState = {
    filter: 'all',
    view: 'grid',
    loading: false,
    liveLoaded: {}
};
var insightsLoaded = {};
var insightsData = {};
var insightsActiveFilter = 'all';
var insightsView = 'grid'; // 'grid' | 'list'

function renderInsights() {
    var totalItems = 0;
    for (var i = 0; i < INSIGHT_FEEDS.length; i++) {
        totalItems += ((insightsData[INSIGHT_FEEDS[i].id] && insightsData[INSIGHT_FEEDS[i].id].length) ? insightsData[INSIGHT_FEEDS[i].id] : INSIGHT_FEEDS[i].seed).length;
    }

    var h = '<div style="padding:88px 0 0">';

    // -- Hero bar --------------------------------------------------------------
    h += '<div style="padding:48px 48px 0">';
    h += '<div class="section-label">Insights</div>';
    h += '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:32px">';
    h += '<div>';
    h += '<h1 class="section-title" style="margin-bottom:8px">Ideas &amp; <em>Conversations</em></h1>';
    h += '<p style="font-size:15px;color:var(--stone);line-height:1.7;max-width:560px">Articles, posts, and episodes by Faisal Hoque across Fast Company, Psychology Today, HBR, MIT Sloan, IMD, LinkedIn, and the CONVERGENCE podcast.</p>';
    h += '</div>';
    h += '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">';
    h += '<button id="insightViewGrid" class="insight-view-btn active" onclick="setInsightView(\'grid\')" title="Grid view">Grid</button>';
    h += '<button id="insightViewList" class="insight-view-btn" onclick="setInsightView(\'list\')" title="List view">List</button>';
    h += '<button class="btn-ghost" style="font-size:var(--font-control);padding:8px 16px;margin-left:4px" onclick="refreshInsights()">Refresh</button>';
    h += '</div>';
    h += '</div>';

    // -- Source filter strip ---------------------------------------------------
    h += '<div id="insightFilters" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;padding-bottom:24px;border-bottom:1px solid var(--rule)">';
    h += '<button class="insight-filter' + (insightsActiveFilter === 'all' ? ' active' : '') + '" data-feed="all" onclick="filterInsights(\'all\')">All <span style="font-size:var(--font-label);opacity:.6">' + totalItems + '</span></button>';
    for (var i = 0; i < INSIGHT_FEEDS.length; i++) {
        var f = INSIGHT_FEEDS[i];
        var cnt = ((insightsData[f.id] && insightsData[f.id].length) ? insightsData[f.id] : f.seed).length;
        var isAct = insightsActiveFilter === f.id;
        var typeIcon = f.type === 'podcast' ? 'Audio: ' : f.type === 'post' ? 'Post: ' : '';
        h += '<button class="insight-filter' + (isAct ? ' active' : '') + '" data-feed="' + f.id + '" onclick="filterInsights(\'' + f.id + '\')" style="--fc:' + f.color + '">' + typeIcon + f.shortLabel + ' <span style="font-size:var(--font-label);opacity:.6">' + cnt + '</span></button>';
    }
    h += '</div>';
    h += '</div>';

    // -- Status bar ------------------------------------------------------------
    h += '<div id="insightStatus" style="padding:0 48px;height:28px;display:flex;align-items:center">';
    h += '<div style="font-family:var(--sans);font-size:var(--font-label);color:var(--stone);letter-spacing:.1em" id="insightStatusText">Loading live feeds…</div>';
    h += '</div>';

    // -- Cards -----------------------------------------------------------------
    h += '<div id="insightGrid" style="padding:0 48px 80px">';
    h += buildInsightCards(insightsActiveFilter, insightsView);
    h += '</div>';

    h += '</div>';

    // Kick off live fetch
    setTimeout(function() {
        loadLiveFeeds(true);
    }, 300);
    return h;
}

function buildInsightCards(filterId, view) {
    var allItems = [];
    for (var i = 0; i < INSIGHT_FEEDS.length; i++) {
        var f = INSIGHT_FEEDS[i];
        if (filterId !== 'all' && f.id !== filterId) continue;
        var items = (insightsData[f.id] && insightsData[f.id].length > 0) ? insightsData[f.id] : f.seed;
        for (var j = 0; j < items.length; j++) {
            allItems.push({
                feed: f,
                item: items[j]
            });
        }
    }
    allItems.sort(function(a, b) {
        var da = a.item.date ? new Date(a.item.date) : new Date(0);
        var db = b.item.date ? new Date(b.item.date) : new Date(0);
        return db - da;
    });

    if (!allItems.length) {
        return '<div style="padding:64px;text-align:center;color:var(--stone);font-family:var(--serif);font-size:20px;font-style:italic">No items in this feed.</div>';
    }

    var isList = (view === 'list');
    var h = isList ?
        '<div style="display:flex;flex-direction:column;gap:0;margin-top:8px">' :
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px;margin-top:8px">';

    for (var k = 0; k < allItems.length; k++) {
        var f2 = allItems[k].feed;
        var it = allItems[k].item;
        var isPodcast = (f2.type === 'podcast');
        var d = it.date ? new Date(it.date) : null;
        var ds = d && !isNaN(d) ? d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : '';
        var url = it.url || f2.profileUrl;
        var excerpt = it.excerpt || '';
        if (excerpt.length > 200) excerpt = excerpt.slice(0, 197) + '…';

        if (isList) {
            h += '<div class="insight-list-row" onclick="window.open(\'' + url + '\',\'_blank\')">';
            h += '<div class="insight-list-source" style="color:' + f2.color + ';border-color:' + f2.color + '30">' + f2.shortLabel + '</div>';
            h += '<div class="insight-list-body">';
            h += '<div class="insight-list-title">' + (isPodcast ? 'Audio: ' : '') + esc(it.title) + '</div>';
            if (excerpt) h += '<div class="insight-list-excerpt">' + esc(excerpt) + '</div>';
            h += '</div>';
            h += '<div class="insight-list-meta">';
            if (ds) h += '<div style="font-family:var(--sans);font-size:var(--font-label);color:var(--stone)">' + ds + '</div>';
            if (isPodcast && it.duration) h += '<div style="font-family:var(--sans);font-size:var(--font-label);color:var(--stone);margin-top:3px">Duration: ' + esc(it.duration) + '</div>';
            h += '</div>';
            h += '</div>';
        } else {
            h += '<div class="insight-card' + (isPodcast ? ' insight-card--podcast' : '') + '" onclick="window.open(\'' + url + '\',\'_blank\')">';
            // Source + date row
            h += '<div class="insight-card-header">';
            h += '<span class="insight-badge" style="background:' + f2.color + '18;color:' + f2.color + ';border-color:' + f2.color + '35">' + f2.iconSvg + ' ' + f2.shortLabel + '</span>';
            if (ds) h += '<span class="insight-date">' + ds + '</span>';
            h += '</div>';
            // Type pip for podcast
            if (isPodcast) h += '<div class="insight-podcast-bar" style="background:' + f2.color + '"></div>';
            // Title
            h += '<div class="insight-title' + (isPodcast ? ' insight-title--podcast' : '') + '">' + (isPodcast ? '<span style="color:' + f2.color + '">Audio </span>' : '') + esc(it.title) + '</div>';
            // Excerpt
            if (excerpt) h += '<div class="insight-excerpt">' + esc(excerpt) + '</div>';
            // Footer
            h += '<div class="insight-card-foot">';
            if (isPodcast && it.duration) h += '<span style="font-family:var(--sans);font-size:var(--font-label);color:var(--stone)">Duration: ' + esc(it.duration) + '</span>';
            h += '<span class="insight-cta">' + (isPodcast ? 'Listen' : 'Read') + ' &rarr;</span>';
            h += '</div>';
            h += '</div>';
        }
    }
    h += '</div>';
    return h;
}

function filterInsights(feedId) {
    insightsActiveFilter = feedId;
    var btns = document.querySelectorAll('.insight-filter');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('active', btns[i].getAttribute('data-feed') === feedId);
    }
    var grid = document.getElementById('insightGrid');
    if (grid) grid.innerHTML = buildInsightCards(feedId, insightsView);
}

function setInsightView(v) {
    insightsView = v;
    var gb = document.getElementById('insightViewGrid');
    var lb = document.getElementById('insightViewList');
    if (gb) gb.classList.toggle('active', v === 'grid');
    if (lb) lb.classList.toggle('active', v === 'list');
    var grid = document.getElementById('insightGrid');
    if (grid) grid.innerHTML = buildInsightCards(insightsActiveFilter, v);
}

function refreshInsights() {
    insightsLoaded = {};
    loadLiveFeeds(true);
}

function updateInsightStatus(msg) {
    var el = document.getElementById('insightStatusText');
    if (el) el.textContent = msg;
}

function loadLiveFeeds(force) {
    var pending = 0;
    var done = 0;
    var live = 0;
    for (var i = 0; i < INSIGHT_FEEDS.length; i++) {
        if (INSIGHT_FEEDS[i].rssProxies && INSIGHT_FEEDS[i].rssProxies.length) pending++;
    }
    if (!pending) {
        updateInsightStatus('Showing ' + _countItems() + ' curated items. No live RSS available.');
        return;
    }

    function onDone() {
        done++;
        if (done >= pending) {
            var total = _countItems();
            updateInsightStatus('Showing ' + total + ' items · ' + live + ' source' + (live !== 1 ? 's' : '') + ' updated live · ' + new Date().toLocaleTimeString());
            if (currentPage === 'insights') {
                var grid = document.getElementById('insightGrid');
                if (grid) grid.innerHTML = buildInsightCards(insightsActiveFilter, insightsView);
            }
        }
    }

    for (var i = 0; i < INSIGHT_FEEDS.length; i++) {
        (function(feed) {
            if (!feed.rssProxies || !feed.rssProxies.length) {
                return;
            }
            if (!force && insightsLoaded[feed.id]) return;
            insightsLoaded[feed.id] = true;
            var proxies = feed.rssProxies.slice();

            function tryNext() {
                if (!proxies.length) {
                    onDone();
                    return;
                }
                var url = proxies.shift();
                fetch(url, {
                        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
                    })
                    .then(function(r) {
                        return r.json();
                    })
                    .then(function(json) {
                        if (json.status === 'ok' && json.items && json.items.length) {
                            insightsData[feed.id] = json.items.slice(0, 8).map(function(it) {
                                var raw = it.description || it.content || '';
                                var ex = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
                                var dur = '';
                                if (it.itunes_duration) {
                                    var s = parseInt(it.itunes_duration, 10);
                                    if (!isNaN(s) && s > 60) dur = Math.floor(s / 60) + ' min';
                                    else if (isNaN(s)) dur = it.itunes_duration;
                                }
                                return {
                                    title: (it.title || '').trim(),
                                    date: (it.pubDate || it.published || '').slice(0, 10),
                                    url: it.link || it.guid || feed.profileUrl,
                                    excerpt: ex,
                                    duration: dur,
                                    thumbnail: it.thumbnail || it.enclosure && it.enclosure.link || ''
                                };
                            });
                            live++;
                            onDone();
                        } else {
                            tryNext();
                        }
                    })
                    .catch(function() {
                        tryNext();
                    });
            }
            tryNext();
        })(INSIGHT_FEEDS[i]);
    }

    updateInsightStatus('Fetching live feeds…');
}

function _countItems() {
    var n = 0;
    for (var i = 0; i < INSIGHT_FEEDS.length; i++) {
        n += ((insightsData[INSIGHT_FEEDS[i].id] && insightsData[INSIGHT_FEEDS[i].id].length) ? insightsData[INSIGHT_FEEDS[i].id] : INSIGHT_FEEDS[i].seed).length;
    }
    return n;
}

// === SIDEBAR ===
function renderSidebar() {
    var sb = document.getElementById('pipSidebar');
    if (!sb) return;
    var showSidebar = (currentPage === 'step' || currentPage === 'phase' || currentPage === 'phase5' || currentPage === 'outcome' || currentPage === 'pipeline');
    sb.style.display = showSidebar ? 'flex' : 'none';
    var app = document.getElementById('app');
    if (app) {
        if (showSidebar && sidebarOpen) {
            app.classList.remove('sidebar-collapsed');
        } else {
            app.classList.add('sidebar-collapsed');
        }
    }
    var btn = document.getElementById('sidebarToggle');
    if (btn) {
        btn.style.display = showSidebar ? 'block' : 'none';
        btn.style.left = sidebarOpen ? '270px' : '16px';
    }
    if (!showSidebar) return;

    var h = '<div class="sidebar-inner">';
    h += '<div class="sidebar-header"><div class="sidebar-logo">AI <span>Pipeline</span></div></div>';
    h += '<div class="sidebar-scroll">';
    h += '<div class="sidebar-home' + (currentPage === 'pipeline' ? ' active' : '') + '" onclick="go(\'pipeline\')">Overview</div>';
    for (var i = 0; i < PH.length; i++) {
        var ph = PH[i];
        var isPhaseActive = (currentPage === 'phase' && currentStep === String(ph.id));
        h += '<div class="sidebar-phase-group">';
        h += '<div class="sidebar-phase-head" onclick="go(\'phase\',\'' + ph.id + '\')">';
        h += '<div class="sidebar-phase-dot" style="background:' + ph.color + '"></div>';
        h += '<span class="sidebar-phase-name" style="color:' + (isPhaseActive ? 'var(--paper)' : ph.color) + '">' + ph.name + '</span>';
        h += '<span class="sidebar-phase-days">' + ph.days + '</span>';
        h += '</div>';
        for (var j = 0; j < ph.steps.length; j++) {
            var s = ph.steps[j];
            var isActive = (currentPage === 'step' && currentStep === s.id);
            var isDone = isStepDone(s.id);
            var cls = 'sidebar-step' + (isActive ? ' active' : isDone ? ' done' : '');
            h += '<div class="' + cls + '" onclick="go(\'step\',\'' + s.id + '\')">' + (isDone && !isActive ? '' : s.icon + ' ') + s.name + '</div>';
        }
        if (ph.outcomes && ph.outcomes.length > 0) {
            h += '<div class="sidebar-outcomes-label">Outputs</div>';
            for (var k = 0; k < ph.outcomes.length; k++) {
                var o = ph.outcomes[k];
                var isOActive = (currentPage === 'outcome' && currentStep === o.id);
                h += '<div class="sidebar-outcome' + (isOActive ? ' active' : '') + '" onclick="go(\'outcome\',\'' + o.id + '\')">' + o.icon + ' ' + o.name + '</div>';
            }
        }
        h += '</div>';
    }
    // duplicate Pipeline Dashboard removed

    h += '</div>';
    h += '<div class="sidebar-footer"><div class="sidebar-footer-text">Next Chapter Academy · Pipeline v3</div></div>';
    h += '</div>';
    sb.innerHTML = h;
    updateSidebarState();
}

function updateSidebarState() {
    var sb = document.getElementById('pipSidebar');
    var app = document.getElementById('app');
    var showSidebar = (currentPage === 'step' || currentPage === 'phase' || currentPage === 'phase5' || currentPage === 'outcome' || currentPage === 'pipeline');
    if (sb) {
        sb.className = 'sidebar' + (sidebarOpen ? '' : ' collapsed');
        sb.style.display = showSidebar ? 'flex' : 'none';
    }
    if (app) {
        if (showSidebar && sidebarOpen) {
            app.classList.remove('sidebar-collapsed');
        } else {
            app.classList.add('sidebar-collapsed');
        }
    }
    var btn = document.getElementById('sidebarToggle');
    if (btn) {
        btn.style.display = showSidebar ? 'block' : 'none';
        btn.style.left = sidebarOpen ? '20px' : '16px';
    }
}

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    updateSidebarState();
}

// === PHASE LANDING (from pipeline) ===
// renderPhaseLanding is provided by pipeline module above

// === OUTCOME PAGES ===
// renderOutcome routes handled by pipeline module above
function renderPhase5() {
    return renderNavDash();
}

function renderPhase5Content() {
    return renderNavDash();
}

function renderOutcome() {
    var id = currentStep;
    var ph = currentPhase;
    var _w = '<div style="padding-top:110px"><div class="wrap" style="max-width:800px;padding:0 24px 80px">';
    var _we = '</div></div>';
    var backH = '<div style="margin-bottom:20px"><button class="btn-ghost" style="font-size:var(--font-control);padding:7px 14px" onclick="go(\'' + (ph ? 'phase-' + ph.id : 'pipeline') + '\')">\u2190 ' + (ph ? 'Phase ' + ph.id + ': ' + ph.name : 'Pipeline') + '</button></div>';
    // Route to pipeline's outcome renderers
    if (id === 'out-report') return _w + backH + renderOutReport() + _we;
    if (id === 'out-bluesky') return _w + backH + renderOutBluesky() + _we;
    if (id === 'out-orgready') return _w + backH + renderOutOrgReady() + _we;
    if (id === 'out-raci') return _w + backH + renderOutRaciFull() + _we;
    if (id === 'out-explore') return _w + backH + renderOutExploreEnhanced() + _we;
    if (id === 'out-devport') return _w + backH + renderOutDevportFull() + _we;
    if (id === 'out-capplan') return _w + backH + renderOutCapplan() + _we;
    if (id === 'out-expbriefs') return _w + backH + renderOutExpbriefsFull() + _we;
    if (id === 'out-govfw') return _w + backH + renderOutGovFW() + _we;
    if (id === 'out-orgrev') return _w + backH + renderOutOrgRev() + _we;
    if (id === 'out-finalport') return _w + backH + renderOutFinalportFull() + _we;
    if (id === 'out-oper') return _w + backH + renderOutOperFull() + _we;
    return '<p style="color:var(--stone)">Output: ' + esc(id) + '</p>';
}

function fetchLiveInsights() {
    if (insightsState.loading) return;
    insightsState.loading = true;
    var btn = document.getElementById('insightRefreshBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Fetching\u2026';
    }
    setInsightStatus('', true);

    // Build one search request per source that has a profileUrl
    // We batch them: ask Claude to search all sources in one call using web_search
    var sourceList = INSIGHT_FEEDS.map(function(f, i) {
        return (i + 1) + '. ' + f.label + ' — profile: ' + f.profileUrl + (f.feedUrl ? ' / rss: ' + f.feedUrl : '');
    }).join('\n');

    var systemPrompt = 'You are a research assistant. Use web_search to find the 3–4 most recent public articles, posts, or podcast episodes for each source listed. Return ONLY a JSON object — no markdown, no explanation. Format:\n{\n  "fastco": [{title,date,url,excerpt},...],\n  "psych": [...],\n  "hbr": [...],\n  "mitsloan": [...],\n  "imd": [...],\n  "linkedin": [...],\n  "convergence": [{title,date,url,excerpt,duration},...]\n}\nFor podcasts include duration if found. Excerpts should be 1–2 sentences. Dates as YYYY-MM-DD or YYYY-MM.';

    var userMsg = 'Find the latest content from Faisal Hoque at these sources:\n' + sourceList + '\n\nReturn only the JSON object described.';

    fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 4000,
                system: systemPrompt,
                tools: [{
                    type: 'web_search_20250305',
                    name: 'web_search'
                }],
                messages: [{
                    role: 'user',
                    content: userMsg
                }]
            })
        })
        .then(function(r) {
            if (!r.ok) throw new Error('API ' + r.status);
            return r.json();
        })
        .then(function(data) {
            insightsState.loading = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '\u21bb Refresh Live';
            }

            // Collect all text blocks from the response (Claude may use tool + then respond)
            var text = '';
            if (data.content && data.content.length) {
                for (var i = 0; i < data.content.length; i++) {
                    if (data.content[i].type === 'text') text += data.content[i].text;
                }
            }

            // Extract JSON from response text
            var parsed = null;
            try {
                var s = text.indexOf('{'),
                    e = text.lastIndexOf('}');
                if (s >= 0 && e > s) parsed = JSON.parse(text.slice(s, e + 1));
            } catch (err) {
                parsed = null;
            }

            if (parsed) {
                var liveCount = 0;
                for (var i = 0; i < INSIGHT_FEEDS.length; i++) {
                    var f = INSIGHT_FEEDS[i];
                    if (parsed[f.id] && Array.isArray(parsed[f.id]) && parsed[f.id].length) {
                        f._live = parsed[f.id].slice(0, 6);
                        insightsState.liveLoaded[f.id] = true;
                        liveCount++;
                    }
                }
                _refreshInsightGrid();
                var total = _insightCount('all');
                setInsightStatus('\u2713 ' + total + ' items \u00b7 ' + liveCount + ' source' + (liveCount !== 1 ? 's' : '') + ' live \u00b7 ' + new Date().toLocaleTimeString(), false);
            } else {
                setInsightStatus('Live fetch complete. Feed data unavailable \u2014 showing curated content.', false);
            }
        })
        .catch(function(err) {
            insightsState.loading = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '\u21bb Refresh Live';
            }
            setInsightStatus('Fetch failed (' + err.message + '). Showing curated content.', false);
            console.error('Insights fetch error:', err);
        });
}

function _refreshInsightGrid() {
    var g = document.getElementById('insightGrid');
    if (g) g.innerHTML = buildInsightCards(insightsState.filter, insightsState.view);
}


// PDF export aliases (bridge pipeline names to master names)
function printAssessmentReport() {
    printReport();
}

function printOrgReadiness() {
    printOrgReady();
}

function printGovernanceFramework() {
    printGovFW();
}

function printCapitalPlan() {
    printCapPlan();
}

function completeStep(id) {
    if (!data.completedSteps) data.completedSteps = {};
    data.completedSteps[id] = true;
    saveData();
    render();
}

// === COACH ===
function toggleCoach() {
    coachOpen = !coachOpen;
    $('coachFab').className = 'coach-fab' + (coachOpen ? ' open' : '');
    $('fabPulse').style.display = coachOpen ? 'none' : 'block';
    $('coachPanel').className = 'coach-panel' + (coachOpen ? ' open' : '');
    if (coachOpen) renderCoachPanel();
}

function renderCoachPanel() {
    var panel = $('coachPanel');
    if (!panel) return;
    var ctx = currentStep ? ('Step ' + currentStep) : 'Overview';
    var h = '<div class="coach-header"><div class="coach-header-title"><span>AI</span> AI Coach</div><button class="coach-close" onclick="toggleCoach()">×</button></div>';
    h += '<div style="padding:10px 24px;border-bottom:1px solid rgba(245,242,236,.06);background:rgba(245,242,236,.02);flex-shrink:0"><div style="font-family:var(--sans);font-size:var(--font-control);letter-spacing:.08em;color:var(--stone)">Context: ' + esc(ctx) + '</div></div>';
    h += '<div class="coach-msgs" id="coachMsgsEl">';
    for (var i = 0; i < coachMsgs.length; i++) {
        var m = coachMsgs[i];
        h += '<div class="coach-msg ' + m.role + '"><div class="coach-sender">' + (m.role === 'ai' ? 'AI Coach' : 'You') + '</div>' + esc(m.text) + '</div>'
    }
    h += '</div>';
    h += '<div class="coach-presets">';
    var presets = ['Where do I start?', 'Help with this step', 'What\'s a stage gate?', 'FIRST framework?', 'Portfolio vs. projects'];
    for (var i = 0; i < presets.length; i++) h += '<button class="coach-preset" onclick="sendCoachPreset(\'' + presets[i] + '\')">' + presets[i] + '</button>';
    h += '</div>';
    h += '<div class="coach-input-row"><textarea id="coachInput" placeholder="Ask about any step, concept, or challenge..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendCoach()}"></textarea><button class="coach-send" onclick="sendCoach()">Send</button></div>';
    panel.innerHTML = h;
    var msgs = document.getElementById('coachMsgsEl');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function sendCoachPreset(t) {
    var inp = document.getElementById('coachInput');
    if (inp) inp.value = t;
    sendCoach();
}

function sendCoach() {
    var inp = document.getElementById('coachInput');
    if (!inp || !inp.value.trim()) return;
    var userText = inp.value.trim();
    inp.value = '';
    coachMsgs.push({
        role: 'user',
        text: userText
    });
    renderCoachPanel();
    var ctx = 'User is working on: ' + (currentStep ? 'Step ' + currentStep + ' (' + currentPhase?.name + ')' : 'the pipeline overview');
    var sysPrompt = 'You are the AI Coach for Faisal Hoque\'s 90-Day AI Innovation Pipeline — a framework grounded in the OPEN and CARE frameworks and published in Fast Company, HBR, and MIT Sloan Management Review. You help leaders build structured AI innovation pipelines through five phases: Diagnose, Organize, Prepare, Ignite, Navigate. Be direct, insightful, and strategic. Maximum 150 words per response. No bullets unless absolutely essential.';

    fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            messages: [{
                role: 'user',
                content: sysPrompt + '\n\n' + ctx + '\n\nUser question: ' + userText
            }]
        })
    }).then(function(r) {
        return r.json()
    }).then(function(j) {
        var text = '';
        if (j.content)
            for (var i = 0; i < j.content.length; i++)
                if (j.content[i].text) text += j.content[i].text;
        if (!text) text = 'Could not generate response. Try again.';
        coachMsgs.push({
            role: 'ai',
            text: text
        });
        renderCoachPanel();
    }).catch(function() {
        coachMsgs.push({
            role: 'ai',
            text: 'Connection error. Please try again.'
        });
        renderCoachPanel()
    });
}


// === GROUP CHAT ===
var gchatOpen = false;
var gchatMsgs = [];
var gchatUnreadCount = 0;

function formatChatTimestamp(dateString) {
    if (!dateString) return '';
    var date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    var hours = date.getHours() % 12 || 12;
    var minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    var ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    return hours + ':' + minutes + ' ' + ampm;
}

function getDynamicGChatMessages() {
    if (typeof TeamChat === 'undefined') return gchatMsgs;
    var state = TeamChat.getState();
    if (state && state.activeTeam && state.messages && state.messages[state.activeTeam]) {
        return state.messages[state.activeTeam].map(function(msg) {
            return {
                who: msg.initials ? msg.initials.charAt(0) : '?',
                name: msg.user_name || 'Unknown',
                ts: formatChatTimestamp(msg.created_at),
                text: msg.message || '',
                userId: msg.user_id || ''
            };
        });
    }
    return gchatMsgs;
}


function gchatColor(who) {
    var map = {
        F: '#B8892A',
        L: '#5a7fbc',
        E: '#5c9e78',
        T: '#9b6fa8'
    };
    return map[who] || 'rgba(138,130,120,.7)'
}

function toggleGChat() {
    gchatOpen = !gchatOpen;
    var fab = document.getElementById('gchatFab');
    var panel = document.getElementById('gchatPanel');
    if (fab) fab.className = 'gchat-fab' + (gchatOpen ? ' open' : '');
    if (panel) panel.className = 'gchat-panel' + (gchatOpen ? ' open' : '');
    if (gchatOpen) {
        gchatUnreadCount = 0;
        var u = document.getElementById('gchatUnread');
        if (u) {
            u.style.display = 'none';
            u.textContent = '0';
        }
        renderGChatPanel();
    }
}

function renderGChatPanel() {
    var panel = document.getElementById('gchatPanel');
    if (!panel) return;
    var existingInput = document.getElementById('gchatInput');
    var draft = existingInput ? existingInput.value : '';
    var selectionStart = existingInput ? existingInput.selectionStart : null;
    var selectionEnd = existingInput ? existingInput.selectionEnd : null;
    var gchatMembers = typeof TeamChat !== 'undefined' ? TeamChat.getGchatMembers() : [];
    var activeTeamName = '';
    if (typeof TeamChat !== 'undefined') {
        var state = TeamChat.getState();
        if (state && state.activeTeam) {
            var activeTeam = state.teams.find(function(t) {
                return t.id === state.activeTeam;
            });
            activeTeamName = activeTeam ? activeTeam.name : '';
        }
    }
    var avHtml = '';
    for (var i = 0; i < gchatMembers.length; i++) {
        avHtml += '<div class="gchat-av" style="background:' + gchatMembers[i].color + ';color:#fff">' + esc(gchatMembers[i].initials || '?') + '</div>';
    }
    var memHtml = '';
    for (var i = 0; i < gchatMembers.length; i++) {
        var m = gchatMembers[i];
        memHtml += '<div class="gchat-member"><div class="gchat-member-av" style="background:' + m.color + ';color:#fff">' + esc(m.initials || '?') + '</div>' + esc(m.name || 'Unknown') + (m.online ? '<div class="gchat-online"></div>' : '') + '</div>';
    }
    var msgsList = getDynamicGChatMessages();
    var h = '<div class="gchat-header"><div class="gchat-header-title"><div class="gchat-avatars">' + avHtml + '</div>' + (activeTeamName ? esc(activeTeamName) + ' Team Room' : 'Team Room') + '</div><button class="gchat-close" onclick="toggleGChat()">×</button></div>';
    if (gchatMembers.length > 0) {
        h += '<div class="gchat-members">' + memHtml + '</div>';
    }
    h += '<div class="gchat-msgs" id="gchatMsgsEl">';
    if (msgsList.length === 0) {
        h += '<div class="gchat-day-div">No messages yet. Start the conversation.</div>';
    } else {
        h += '<div class="gchat-day-div">Today</div>';
        for (var i = 0; i < msgsList.length; i++) {
            var msg = msgsList[i];
            var isMe = msg.userId && window.currentUser && msg.userId === window.currentUser.id;
            var cls = isMe ? 'me' : 'them';
            var col = gchatColor(msg.who);
            h += '<div class="gchat-msg ' + cls + '">';
            h += '<div class="gchat-msg-av" style="background:' + col + ';color:#fff">' + esc(msg.who || '?') + '</div>';
            h += '<div class="gchat-msg-body">';
            h += '<div class="gchat-msg-meta">' + esc(isMe ? 'You' : msg.name || 'Unknown') + ' · ' + esc(msg.ts || '') + '</div>';
            h += '<div class="gchat-msg-text">' + esc(msg.text || '') + '</div>';
            h += '</div></div>';
        }
    }
    h += '</div>';
    h += '<div class="gchat-typing" id="gchatTyping"></div>';
    h += '<div class="gchat-input-row"><textarea id="gchatInput" placeholder="Message the team..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendGChat()}"></textarea><button class="gchat-send" onclick="sendGChat()">Send</button></div>';
    panel.innerHTML = h;
    var restoredInput = document.getElementById('gchatInput');
    if (restoredInput && draft) {
        restoredInput.value = draft;
        if (selectionStart !== null && selectionEnd !== null) {
            restoredInput.setSelectionRange(selectionStart, selectionEnd);
        }
    }
    var msgs = document.getElementById('gchatMsgsEl');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function sendGChat() {
    var inp = document.getElementById('gchatInput');
    if (!inp || !inp.value.trim()) return;
    var text = inp.value.trim();
    if (typeof TeamChat === 'undefined') {
        var now = new Date();
        var ts = formatChatTimestamp(now.toISOString());
        gchatMsgs.push({
            who: 'F',
            name: 'You',
            ts: ts,
            text: text
        });
        inp.value = '';
        renderGChatPanel();
        return;
    }

    var state = TeamChat.getState();
    if (!state || !state.activeTeam) {
        alert('Please open a team chat before sending a message.');
        return;
    }

    TeamChat.sendMessage(state.activeTeam, text).then(function(sent) {
        if (sent === false) return;
        var currentInp = document.getElementById('gchatInput');
        if (currentInp && currentInp.value.trim() === text) currentInp.value = '';
        renderGChatPanel();
    });
}

// === NOTES ===
function toggleNotes() {
    notesOpen = !notesOpen;
    $('notesFab').className = 'notes-fab' + (notesOpen ? ' open' : '');
    $('notesPanel').className = 'notes-panel' + (notesOpen ? ' open' : '');
    if (notesOpen) renderNotesPanel();
}

function updateNotesCount() {
    var el = $('notesCount');
    if (el) el.textContent = (data.notes || []).length;
}

function renderNotesPanel() {
    var panel = $('notesPanel');
    if (!panel) return;
    var h = '<div class="notes-header"><div class="notes-header-title">&#9998; Notes</div><button class="notes-close" onclick="toggleNotes()">×</button></div>';
    h += '<div class="notes-list">';
    var notes = data.notes || [];
    if (!notes.length) h += '<div class="notes-empty">Capture insights as you work through the pipeline.</div>';
    else
        for (var i = notes.length - 1; i >= 0; i--) {
            var n = notes[i];
            h += '<div class="note-card"><div class="note-text">' + esc(n.text) + '</div><div class="note-meta"><span class="note-date">' + (n.step ? 'Step ' + n.step + ' · ' : '') + fmt(n.createdAt) + '</span><button class="note-del" onclick="deleteNote(\'' + n.id + '\')">×</button></div></div>'
        }
    h += '</div>';
    h += '<div class="notes-input-row"><textarea id="notesInput" placeholder="Write a note..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();addNote()}"></textarea><button class="notes-send" onclick="addNote()">&#9998;</button></div>';
    panel.innerHTML = h;
}

function addNote() {
    var inp = document.getElementById('notesInput');
    if (!inp || !inp.value.trim()) return;
    if (!data.notes) data.notes = [];
    data.notes.push({
        id: uid(),
        text: inp.value.trim(),
        step: currentStep,
        createdAt: Date.now()
    });
    saveData();
    renderNotesPanel();
    updateNotesCount();
}

function deleteNote(id) {
    data.notes = (data.notes || []).filter(function(n) {
        return n.id !== id
    });
    saveData();
    renderNotesPanel();
    updateNotesCount();
}

// === HELP MODAL ===
var currentModal = null;

function openHelp() {
    currentModal = 'help';
    renderModal();
}

function closeModal() {
    currentModal = null;
    var mr = $('modalRoot');
    if (mr) mr.innerHTML = '';
}

function renderModal() {
    var mr = $('modalRoot');
    if (!mr) return;
    if (!currentModal) {
        mr.innerHTML = '';
        return;
    }

    var h = '<div class="modal-bg" onclick="if(event.target===this)closeModal()">';
    h += '<div class="modal">';
    h += '<h3>90-Day AI Innovation Pipeline</h3>';

    h += '<div style="background:rgba(184,137,42,.06);border-left:2px solid var(--gold);padding:16px 20px;margin-bottom:28px;font-family:var(--serif);font-size:17px;font-style:italic;font-weight:300;line-height:1.55;color:var(--gold-pale)">AI adoption without structure is theatre. This framework transforms the aspiration into an operating discipline.</div>';

    h += '<div style="margin-bottom:24px"><div class="section-label" style="margin-bottom:12px">What This Is</div>';
    h += '<p style="font-size:16px;color:var(--stone);line-height:1.75">A structured, step-by-step implementation tool for building an AI innovation pipeline inside your organization. Five sequential phases guide you from readiness assessment through live portfolio management. Your progress, ideas, assessments, and outputs are all saved locally in your browser \u2014 nothing is sent to a server.</p></div>';

    h += '<div style="margin-bottom:24px"><div class="section-label" style="margin-bottom:12px">Getting Around</div>';
    h += '<div style="display:grid;gap:8px">';
    var navRows = [{
            k: 'Top nav',
            v: 'Home \xb7 Learn \xb7 Pipeline \xb7 Navigate \xb7 Insights. The Help, Voice, and Reset buttons sit at the top right.'
        },
        {
            k: 'Left sidebar',
            v: 'Visible on Pipeline and Navigate pages. Shows all five phases, every step, and every output document. Click \u2630 to collapse.'
        },
        {
            k: 'Phase landings',
            v: 'Click any phase number in the sidebar or Pipeline overview. Shows completion %, live metrics, the full step sequence, and links to all phase outputs.'
        }
    ];
    for (var i = 0; i < navRows.length; i++) {
        var nr = navRows[i];
        h += '<div style="display:grid;grid-template-columns:110px 1fr;gap:12px;padding:10px 14px;background:rgba(245,242,236,.03);border:1px solid rgba(245,242,236,.06)"><div style="font-family:var(--sans);font-size:var(--font-label);letter-spacing:.1em;text-transform:uppercase;color:var(--gold);padding-top:2px">' + nr.k + '</div><div style="font-size:var(--font-16);;color:var(--stone);line-height:1.65">' + nr.v + '</div></div>';
    }
    h += '</div></div>';

    h += '<div style="margin-bottom:24px"><div class="section-label" style="margin-bottom:12px">The Five Phases</div>';
    h += '<div style="display:grid;gap:0">';
    var helpPhases = [{
            n: '01',
            t: 'Diagnose \u2014 Days 1\u201330',
            col: '#1B6B5A',
            steps: 'Assessment Battery \xb7 Brainstorm Use Cases \xb7 Filter & Rank',
            out: 'Assessment Report \xb7 Blue Sky Portfolio',
            d: 'Run a full organizational AI readiness assessment. Surface every potential use case into a Blue Sky Portfolio. Apply the FIRST framework to score and rank ideas.'
        },
        {
            n: '02',
            t: 'Organize \u2014 Days 31\u201350',
            col: '#2D5A8E',
            steps: 'Ownership & Structure \xb7 Realign Incentives \xb7 Innovation Rhythm \xb7 Deepen Assessment',
            out: 'Org Readiness Summary \xb7 RACI Matrix \xb7 Exploration Portfolio',
            d: 'Assign named owners with explicit decision authority. Align incentives to innovation behavior. Establish a weekly cadence. Run SWOT and gap analysis on selected ideas to build the Exploration Portfolio.'
        },
        {
            n: '03',
            t: 'Prepare \u2014 Days 51\u201370',
            col: '#8B5E3C',
            steps: 'Structure Portfolio \xb7 Allocate Capital \xb7 Design Experiments',
            out: 'Development Portfolio \xb7 Capital Plan \xb7 Experiment Briefs',
            d: 'Sort projects by time horizon (quick win / medium / strategic). Set a capital allocation plan with stage-gate thresholds. Write experiment briefs with owners, success metrics, and budgets.'
        },
        {
            n: '04',
            t: 'Ignite \u2014 Days 71\u201390',
            col: '#9B2D3F',
            steps: 'Launch Experiments \xb7 Establish Governance \xb7 Stress-Test Org Design \xb7 First Portfolio Review',
            out: 'Governance Framework \xb7 Org Design Review \xb7 Updated Dev Portfolio',
            d: 'Activate experiments and track status. Lock in three governance mechanisms: a standing leadership agenda, stage-gate discipline, and a quarterly review cycle. Stress-test decision rights, ownership, and incentives. Run the first Buy / Hold / Sell review.'
        },
        {
            n: '05',
            t: 'Navigate \u2014 Ongoing',
            col: '#6B4C8A',
            steps: 'Pipeline Dashboard',
            out: 'Operational Portfolio',
            d: 'Manage the live pipeline. View all four stages in real time. Make quarterly Buy, Hold, or Sell decisions on every project. The engine runs continuously.'
        }
    ];
    for (var i = 0; i < helpPhases.length; i++) {
        var hp = helpPhases[i];
        h += '<div style="display:grid;grid-template-columns:28px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid rgba(245,242,236,.06)">';
        h += '<div style="font-family:var(--sans);font-size:var(--font-readable-sm);font-weight:700;color:' + hp.col + ';padding-top:2px">' + hp.n + '</div>';
        h += '<div>';
        h += '<div style="font-size:16px;font-weight:600;color:var(--paper);margin-bottom:5px">' + hp.t + '</div>';
        h += '<p style="font-size:var(--font-16);;color:var(--stone);line-height:1.65;margin-bottom:8px">' + hp.d + '</p>';
        h += '<div style="display:flex;gap:20px;flex-wrap:wrap">';
        h += '<div style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.7)"><span style="color:' + hp.col + ';font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:var(--font-label);margin-right:6px">Steps</span>' + hp.steps + '</div>';
        h += '<div style="font-size:var(--font-readable-sm);color:rgba(138,130,120,.7)"><span style="color:' + hp.col + ';font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:var(--font-label);margin-right:6px">Outputs</span>' + hp.out + '</div>';
        h += '</div></div></div>';
    }
    h += '</div></div>';

    h += '<div style="margin-bottom:24px"><div class="section-label" style="margin-bottom:12px">The Pipeline Funnel</div>';
    h += '<p style="font-size:16px;color:var(--stone);line-height:1.75;margin-bottom:12px">Ideas flow through four stages as they progress. Counts update in real time across the entire app.</p>';
    h += '<div style="display:flex;gap:0;border:1px solid rgba(245,242,236,.08)">';
    var funnelStages = [{
        n: 'Blue Sky',
        c: '#1B6B5A',
        d: 'All ideas \u2014 unassessed'
    }, {
        n: 'Exploration',
        c: '#2D5A8E',
        d: 'Selected & assessed'
    }, {
        n: 'Development',
        c: '#8B5E3C',
        d: 'Funded experiments'
    }, {
        n: 'Operational',
        c: '#9B2D3F',
        d: 'Live & scaling'
    }];
    for (var i = 0; i < funnelStages.length; i++) {
        var fs = funnelStages[i];
        h += '<div style="flex:1;padding:12px 14px;border-right:1px solid rgba(245,242,236,.08);background:' + fs.c + '10"><div style="font-family:var(--sans);font-size:var(--font-label);font-weight:700;color:' + fs.c + ';text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">' + fs.n + '</div><div style="font-size:var(--font-16);color:var(--stone);line-height:1.4">' + fs.d + '</div></div>';
    }
    h += '</div></div>';

    h += '<div style="margin-bottom:24px"><div class="section-label" style="margin-bottom:12px">Tools</div>';
    h += '<div style="display:grid;gap:8px">';
    var tools = [{
            ic: '\u2726 AI Coach',
            d: 'Gold button, bottom right. Context-aware for whichever step you are on. Grounded in the OPEN and CARE frameworks. Ask it anything about the current step, your data, or portfolio decisions.'
        },
        {
            ic: '\u270e Notes',
            d: 'Bottom right. Capture thoughts as you work through each step. Notes are tagged to the step you are on when you write them.'
        },
        {
            ic: '\u2261 Team Chat',
            d: 'Log decisions and messages with your team. Separate from the AI Coach conversation.'
        },
        {
            ic: '\u25c9 Voice',
            d: 'Top-right nav button. Navigate hands-free. Say: \u201chome\u201d \xb7 \u201clearn\u201d \xb7 \u201cpipeline\u201d \xb7 \u201cnavigate\u201d \xb7 \u201copen coach\u201d \xb7 \u201copen notes\u201d \xb7 \u201cclose\u201d'
        }
    ];
    for (var i = 0; i < tools.length; i++) {
        var tl = tools[i];
        h += '<div style="display:grid;grid-template-columns:100px 1fr;gap:12px;padding:10px 14px;background:rgba(245,242,236,.03);border:1px solid rgba(245,242,236,.06)"><div style="font-family:var(--sans);font-size:var(--font-label);letter-spacing:.1em;text-transform:uppercase;color:var(--gold);padding-top:2px">' + tl.ic + '</div><div style="font-size:var(--font-16);;color:var(--stone);line-height:1.65">' + tl.d + '</div></div>';
    }
    h += '</div></div>';

    h += '<div style="margin-bottom:24px"><div class="section-label" style="margin-bottom:12px">Navigate Dashboard</div>';
    h += '<p style="font-size:16px;color:var(--stone);line-height:1.75">The Navigate tab is your live operations center. It shows real-time pipeline stage counts, per-portfolio views (Blue Sky, Exploration, Development, Operational, No-Go), and a Data Bank linking to all phase output documents. Buy / Hold / Sell decisions made in Phase 4 move projects between stages automatically.</p></div>';

    h += '<div style="margin-bottom:24px"><div class="section-label" style="margin-bottom:12px">Insights</div>';
    h += '<p style="font-size:16px;color:var(--stone);line-height:1.75">Curated articles, essays, and podcast episodes by Faisal Hoque \u2014 sourced from Fast Company, Psychology Today, Harvard Business Review, MIT Sloan Management Review, IMD, LinkedIn, and the CONVERGENCE podcast. Use the Refresh button to pull the latest content.</p></div>';

    h += '<div style="margin-bottom:24px"><div class="section-label" style="margin-bottom:12px">Data &amp; Privacy</div>';
    h += '<p style="font-size:16px;color:var(--stone);line-height:1.75">All your data \u2014 ideas, assessments, capital plans, experiment briefs, governance decisions \u2014 is stored in your browser\'s local storage only. Nothing is synced or shared. The AI Coach sends only your question and current step context to the Anthropic API. Use <strong style="color:var(--paper)">Reset</strong> in the top nav to clear all stored data.</p></div>';

    h += '<div style="text-align:center;padding-top:8px"><button class="btn-gold" onclick="closeModal()">Got It</button></div>';
    h += '</div></div>';
    mr.innerHTML = h;
}


// === VOICE ACTIVATION ===
var voiceActive = false,
    recognition = null,
    voiceTimeout = null;

function toggleVoice() {
    if (voiceActive) {
        voiceActive = false;
        if (recognition) {
            try {
                recognition.stop()
            } catch (e) {}
        }
        updateVoiceUI();
        return;
    }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        showVoiceToast('Voice not supported', 'Use Chrome, Edge, or Safari');
        return
    }
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    recognition.onstart = function() {
        voiceActive = true;
        updateVoiceUI();
        showVoiceToast('Listening\u2026', 'Try: "learn" \u00b7 "pipeline" \u00b7 "navigate" \u00b7 "open coach"')
    };
    recognition.onresult = function(e) {
        var final = '',
            interim = '';
        for (var i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript;
            else interim += e.results[i][0].transcript
        }
        var display = final || interim;
        if (display) {
            var t = $('voiceToast');
            if (t) {
                t.innerHTML = '<div class="voice-transcript">\u201c' + display.trim() + '\u201d</div>';
                t.classList.add('show')
            }
        }
        if (final) {
            processVoice(final.trim().toLowerCase())
        }
    };
    recognition.onerror = function(e) {
        if (e.error === 'not-allowed') showVoiceToast('Microphone blocked', 'Allow mic access in browser settings');
        else if (e.error !== 'no-speech' && e.error !== 'aborted') showVoiceToast('Error: ' + e.error, '')
    };
    recognition.onend = function() {
        voiceActive = false;
        recognition = null;
        updateVoiceUI();
        clearTimeout(voiceTimeout);
        voiceTimeout = setTimeout(function() {
            var t = $('voiceToast');
            if (t) t.classList.remove('show')
        }, 4000)
    };
    try {
        recognition.start()
    } catch (e) {
        showVoiceToast('Could not start mic', '' + e.message);
        voiceActive = false;
        updateVoiceUI()
    }
}

function updateVoiceUI() {
    var fab = $('voiceFab'),
        lbl = $('voiceLabel');
    if (fab) {
        if (voiceActive) {
            fab.classList.add('listening');
            if (lbl) lbl.textContent = 'Listening…'
        } else {
            fab.classList.remove('listening');
            if (lbl) lbl.textContent = 'Voice'
        }
    }
    var nb = $('navVoiceBtn');
    if (nb) {
        if (voiceActive) {
            nb.style.borderColor = 'var(--gold)';
            nb.style.color = 'var(--gold)';
            nb.textContent = 'Listening...'
        } else {
            nb.style.borderColor = '';
            nb.style.color = '';
            nb.innerHTML = 'Voice'
        }
    }
}

function showVoiceToast(msg, sub) {
    var t = $('voiceToast');
    if (!t) return;
    t.innerHTML = '<div>' + msg + '</div>' + (sub ? '<div class="voice-cmd">' + sub + '</div>' : '');
    t.classList.add('show');
    clearTimeout(voiceTimeout);
    voiceTimeout = setTimeout(function() {
        t.classList.remove('show')
    }, 6000);
}

function processVoice(text) {
    var matched = true;
    if (text.match(/\b(overview|home|go home|main|start)\b/)) go('home');
    else if (text.match(/\b(learn|read|research|library|articles?|books?|videos?|podcast)\b/)) go('learn');
    else if (text.match(/\b(pipeline|phases?|journey|steps?)\b/)) go('pipeline');
    else if (text.match(/\b(navigate|dashboard|operational|live)\b/)) go('phase5');
    else if (text.match(/\b(help)\b|how does this work/)) {
        openHelp();
        showVoiceToast('\u2713 Opening help', '')
    } else if (text.match(/\b(coach)\b|ask.*coach|open.*coach/)) {
        if (!coachOpen) toggleCoach();
        showVoiceToast('\u2713 Opening AI Coach', '')
    } else if (text.match(/\b(notes?)\b|open.*note/)) {
        if (!notesOpen) toggleNotes();
        showVoiceToast('\u2713 Opening notes', '')
    } else if (text.match(/\b(close|stop|cancel|never mind|dismiss)\b/)) {
        closeModal();
        if (coachOpen) toggleCoach();
        if (notesOpen) toggleNotes();
        showVoiceToast('Closed', '')
    } else {
        matched = false;
        showVoiceToast('Didn\u2019t catch that', 'Try: "learn" \u00b7 "pipeline" \u00b7 "coach" \u00b7 "navigate"')
    }
    if (matched && !text.match(/close|stop|cancel/)) showVoiceToast('\u2713 ' + text, '');
}

// Init
initApp();