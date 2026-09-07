import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity, 
  Heart, 
  Scale, 
  Thermometer, 
  Droplets, 
  Calendar, 
  Plus, 
  FileText, 
  Pill, 
  Edit2, 
  Sparkles, 
  Info,
  ChevronRight,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Visit } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface VisitMetricsTrendsProps {
  visits: Visit[];
  loading?: boolean;
  onRecordVisit: () => void;
  onEditVisit?: (visit: Visit) => void;
  clientName: string;
}

export type ExtractedMetricType = 
  | 'bloodPressure' 
  | 'weight' 
  | 'heartRate' 
  | 'bloodSugar' 
  | 'temperature' 
  | 'painScore';

interface ExtractedDataPoint {
  visitId: string;
  date: Date;
  formattedDate: string;
  shortDate: string;
  notes: string;
  matchedSnippet: string;
  supplements: string[];
  // Extracted values
  weight?: number; // kg
  weightUnit?: string;
  systolic?: number; // mmHg
  diastolic?: number; // mmHg
  heartRate?: number; // bpm
  bloodSugar?: number; // mg/dL
  bloodSugarUnit?: string;
  temperature?: number; // °C
  temperatureUnit?: string;
  painScore?: number; // 0-10
}

const parseVisitDate = (date: any): Date => {
  if (!date) return new Date();
  if (typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  if (date.seconds) return new Date(date.seconds * 1000);
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Helper: Extract metrics from a visit note string
const extractMetricsFromNote = (note: string): Partial<ExtractedDataPoint> & { matchedSnippets: Record<string, string> } => {
  const result: Partial<ExtractedDataPoint> & { matchedSnippets: Record<string, string> } = {
    matchedSnippets: {}
  };
  if (!note || typeof note !== 'string') return result;

  const cleanNote = note.trim();

  // 1. Blood Pressure: e.g. "BP: 120/80", "BP 135/88", "120/80 mmHg", "blood pressure: 118/76"
  const bpRegex = /(?:(?:bp|blood\s*pressure|b\.p\.)[:\s]*)?([0-9]{2,3})\s*[\/\\]\s*([0-9]{2,3})(?:\s*mmhg)?/i;
  // Make sure if it didn't match with prefix, check if standard 3-digit/2-digit pattern exists with context
  const bpMatch = cleanNote.match(bpRegex);
  if (bpMatch) {
    const sys = parseInt(bpMatch[1], 10);
    const dia = parseInt(bpMatch[2], 10);
    // Clinical plausibility check for BP: systolic 60-260, diastolic 35-150
    if (sys >= 60 && sys <= 260 && dia >= 35 && dia <= 150) {
      result.systolic = sys;
      result.diastolic = dia;
      result.matchedSnippets['bloodPressure'] = bpMatch[0];
    }
  }

  // 2. Weight: e.g. "Weight: 72kg", "wt: 74.5 kg", "weighed 68 kg", "70.5kg", "Weight 160 lbs"
  const weightRegex1 = /(?:weight|wt|weighed)[:\s]*([0-9]+(?:\.[0-9]+)?)\s*(kg|kgs|kilos|lbs|pounds)?/i;
  const weightRegex2 = /\b([0-9]{2,3}(?:\.[0-9]+)?)\s*(?:kg|kgs|kilos)\b/i;
  const wMatch = cleanNote.match(weightRegex1) || cleanNote.match(weightRegex2);
  if (wMatch) {
    let val = parseFloat(wMatch[1]);
    const unit = (wMatch[2] || 'kg').toLowerCase();
    if (unit.startsWith('lb') || unit.startsWith('pound')) {
      // Keep kg for standardized charting
      val = Math.round((val * 0.453592) * 10) / 10;
    }
    if (val >= 25 && val <= 300) {
      result.weight = val;
      result.weightUnit = 'kg';
      result.matchedSnippets['weight'] = wMatch[0];
    }
  }

  // 3. Heart Rate / Pulse: e.g. "Pulse: 72 bpm", "Heart rate 78", "HR: 80", "pulse 74"
  const hrRegex1 = /(?:heart\s*rate|pulse|hr|h\.r\.)[:\s]*([0-9]{2,3})\s*(?:bpm)?/i;
  const hrRegex2 = /\b([0-9]{2,3})\s*bpm\b/i;
  const hrMatch = cleanNote.match(hrRegex1) || cleanNote.match(hrRegex2);
  if (hrMatch) {
    const hr = parseInt(hrMatch[1], 10);
    if (hr >= 40 && hr <= 220) {
      result.heartRate = hr;
      result.matchedSnippets['heartRate'] = hrMatch[0];
    }
  }

  // 4. Blood Sugar / Glucose: e.g. "Blood sugar: 95 mg/dL", "Glucose: 5.4 mmol/L", "FBS 104"
  const bsRegex = /(?:blood\s*sugar|glucose|fbs|rbs)[:\s]*([0-9]+(?:\.[0-9]+)?)\s*(mg\/dl|mmol\/l)?/i;
  const bsMatch = cleanNote.match(bsRegex);
  if (bsMatch) {
    let bs = parseFloat(bsMatch[1]);
    const unit = bsMatch[2]?.toLowerCase() || (bs < 25 ? 'mmol/l' : 'mg/dl');
    if (unit === 'mmol/l') {
      // Normalize to mg/dL for consistent graphing (1 mmol/L ~ 18 mg/dL)
      bs = Math.round(bs * 18.0182 * 10) / 10;
    }
    if (bs >= 40 && bs <= 600) {
      result.bloodSugar = bs;
      result.bloodSugarUnit = 'mg/dL';
      result.matchedSnippets['bloodSugar'] = bsMatch[0];
    }
  }

  // 5. Temperature: e.g. "Temp: 36.8 C", "Temperature 98.6 F", "Temp 37.1"
  const tempRegex = /(?:temperature|temp)[:\s]*([0-9]{2}(?:\.[0-9]+)?)\s*(?:°\s*)?([cf])?/i;
  const tempMatch = cleanNote.match(tempRegex);
  if (tempMatch) {
    let t = parseFloat(tempMatch[1]);
    const unit = tempMatch[2]?.toUpperCase() || (t > 50 ? 'F' : 'C');
    if (unit === 'F') {
      // Convert Fahrenheit to Celsius
      t = Math.round(((t - 32) * 5 / 9) * 10) / 10;
    }
    if (t >= 34 && t <= 42) {
      result.temperature = t;
      result.temperatureUnit = '°C';
      result.matchedSnippets['temperature'] = tempMatch[0];
    }
  }

  // 6. Pain Score: e.g. "Pain: 3/10", "Pain level: 4", "Discomfort 5/10"
  const painRegex = /(?:pain|discomfort)(?:\s*(?:score|scale|level))?[:\s]*([0-9]+(?:\.[0-9]+)?)\s*(?:\/\s*10)?/i;
  const painMatch = cleanNote.match(painRegex);
  if (painMatch) {
    const p = parseFloat(painMatch[1]);
    if (p >= 0 && p <= 10) {
      result.painScore = p;
      result.matchedSnippets['painScore'] = painMatch[0];
    }
  }

  return result;
};

export const VisitMetricsTrends: React.FC<VisitMetricsTrendsProps> = ({
  visits,
  loading = false,
  onRecordVisit,
  onEditVisit,
  clientName
}) => {
  const [selectedMetric, setSelectedMetric] = useState<ExtractedMetricType>('bloodPressure');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Process all visits chronologically (oldest to newest for charting)
  const allParsedData = useMemo(() => {
    const chronologicallySorted = [...visits].sort((a, b) => {
      return parseVisitDate(a.date).getTime() - parseVisitDate(b.date).getTime();
    });

    const parsedPoints: ExtractedDataPoint[] = [];

    chronologicallySorted.forEach(visit => {
      const vDate = parseVisitDate(visit.date);
      const note = visit.notes || '';
      const extracted = extractMetricsFromNote(note);

      // Check if at least one metric was extracted
      const hasAnyMetric = 
        extracted.systolic !== undefined ||
        extracted.weight !== undefined ||
        extracted.heartRate !== undefined ||
        extracted.bloodSugar !== undefined ||
        extracted.temperature !== undefined ||
        extracted.painScore !== undefined;

      if (hasAnyMetric) {
        parsedPoints.push({
          visitId: visit.id,
          date: vDate,
          formattedDate: format(vDate, 'PPP'),
          shortDate: format(vDate, 'MMM d'),
          notes: note,
          matchedSnippet: Object.values(extracted.matchedSnippets).join(', '),
          supplements: Array.isArray(visit.supplements) ? visit.supplements : [],
          weight: extracted.weight,
          weightUnit: extracted.weightUnit,
          systolic: extracted.systolic,
          diastolic: extracted.diastolic,
          heartRate: extracted.heartRate,
          bloodSugar: extracted.bloodSugar,
          bloodSugarUnit: extracted.bloodSugarUnit,
          temperature: extracted.temperature,
          temperatureUnit: extracted.temperatureUnit,
          painScore: extracted.painScore
        });
      }
    });

    return parsedPoints;
  }, [visits]);

  // Metric metadata definition
  const metricConfigs: Record<ExtractedMetricType, {
    label: string;
    unit: string;
    icon: React.ElementType;
    color: string;
    secondaryColor?: string;
    normalMin?: number;
    normalMax?: number;
    description: string;
  }> = {
    bloodPressure: {
      label: 'Blood Pressure',
      unit: 'mmHg',
      icon: Activity,
      color: '#059669', // Emerald 600
      secondaryColor: '#3b82f6', // Blue 500
      normalMin: 80,
      normalMax: 120,
      description: 'Systolic and diastolic pressures extracted from visit notes'
    },
    weight: {
      label: 'Weight',
      unit: 'kg',
      icon: Scale,
      color: '#059669',
      description: 'Body weight measurements recorded during consultations'
    },
    heartRate: {
      label: 'Heart Rate / Pulse',
      unit: 'bpm',
      icon: Heart,
      color: '#e11d48', // Rose 600
      normalMin: 60,
      normalMax: 100,
      description: 'Resting pulse rate tracked across visits'
    },
    bloodSugar: {
      label: 'Blood Sugar (Glucose)',
      unit: 'mg/dL',
      icon: Droplets,
      color: '#d97706', // Amber 600
      normalMin: 70,
      normalMax: 100,
      description: 'Glucose levels extracted from clinical notes'
    },
    temperature: {
      label: 'Temperature',
      unit: '°C',
      icon: Thermometer,
      color: '#ea580c', // Orange 600
      normalMin: 36.5,
      normalMax: 37.5,
      description: 'Body temperature recordings'
    },
    painScore: {
      label: 'Pain / Severity',
      unit: '/10',
      icon: Sparkles,
      color: '#7c3aed', // Violet 600
      normalMin: 0,
      normalMax: 3,
      description: 'Self-reported pain or discomfort score (0-10)'
    }
  };

  // Determine which metrics have available data in notes
  const availableMetrics = useMemo(() => {
    const counts: Record<ExtractedMetricType, number> = {
      bloodPressure: 0,
      weight: 0,
      heartRate: 0,
      bloodSugar: 0,
      temperature: 0,
      painScore: 0
    };

    allParsedData.forEach(p => {
      if (p.systolic !== undefined) counts.bloodPressure += 1;
      if (p.weight !== undefined) counts.weight += 1;
      if (p.heartRate !== undefined) counts.heartRate += 1;
      if (p.bloodSugar !== undefined) counts.bloodSugar += 1;
      if (p.temperature !== undefined) counts.temperature += 1;
      if (p.painScore !== undefined) counts.painScore += 1;
    });

    return counts;
  }, [allParsedData]);

  // Current filtered dataset for the selected metric
  const currentChartData = useMemo(() => {
    return allParsedData.filter(p => {
      if (selectedMetric === 'bloodPressure') return p.systolic !== undefined && p.diastolic !== undefined;
      if (selectedMetric === 'weight') return p.weight !== undefined;
      if (selectedMetric === 'heartRate') return p.heartRate !== undefined;
      if (selectedMetric === 'bloodSugar') return p.bloodSugar !== undefined;
      if (selectedMetric === 'temperature') return p.temperature !== undefined;
      if (selectedMetric === 'painScore') return p.painScore !== undefined;
      return false;
    });
  }, [allParsedData, selectedMetric]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (currentChartData.length === 0) return null;

    const first = currentChartData[0];
    const latest = currentChartData[currentChartData.length - 1];

    let firstVal: number | string = 0;
    let latestVal: number | string = 0;
    let changeDisplay = '';
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';

    if (selectedMetric === 'bloodPressure') {
      firstVal = `${first.systolic}/${first.diastolic}`;
      latestVal = `${latest.systolic}/${latest.diastolic}`;
      const diffSys = (latest.systolic || 0) - (first.systolic || 0);
      const diffDia = (latest.diastolic || 0) - (first.diastolic || 0);
      changeDisplay = `${diffSys >= 0 ? '+' : ''}${diffSys} / ${diffDia >= 0 ? '+' : ''}${diffDia} mmHg`;
      trendDirection = diffSys > 0 ? 'up' : diffSys < 0 ? 'down' : 'stable';
    } else {
      let fNum = 0;
      let lNum = 0;
      if (selectedMetric === 'weight') { fNum = first.weight || 0; lNum = latest.weight || 0; }
      else if (selectedMetric === 'heartRate') { fNum = first.heartRate || 0; lNum = latest.heartRate || 0; }
      else if (selectedMetric === 'bloodSugar') { fNum = first.bloodSugar || 0; lNum = latest.bloodSugar || 0; }
      else if (selectedMetric === 'temperature') { fNum = first.temperature || 0; lNum = latest.temperature || 0; }
      else if (selectedMetric === 'painScore') { fNum = first.painScore || 0; lNum = latest.painScore || 0; }

      firstVal = fNum;
      latestVal = lNum;
      const diff = Math.round((lNum - fNum) * 10) / 10;
      changeDisplay = `${diff >= 0 ? '+' : ''}${diff} ${metricConfigs[selectedMetric].unit}`;
      trendDirection = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
    }

    return {
      firstVal,
      latestVal,
      changeDisplay,
      trendDirection,
      count: currentChartData.length,
      firstDate: first.formattedDate,
      latestDate: latest.formattedDate
    };
  }, [currentChartData, selectedMetric]);

  // Set default selected metric to one that actually has data
  React.useEffect(() => {
    if (availableMetrics[selectedMetric] === 0) {
      const keys = Object.keys(availableMetrics) as ExtractedMetricType[];
      const found = keys.find(k => availableMetrics[k] > 0);
      if (found) {
        setSelectedMetric(found);
      }
    }
  }, [availableMetrics, selectedMetric]);

  if (loading) {
    return (
      <div id="visit-metrics-loading" className="bg-white border border-zinc-200 rounded-3xl p-12 text-center shadow-sm">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-zinc-500 font-medium text-sm">Analyzing visit notes for health metric trends...</p>
      </div>
    );
  }

  const config = metricConfigs[selectedMetric];
  const IconComponent = config.icon;

  return (
    <div id="visit-metrics-trends-section" className="space-y-6">
      {/* Metric Type Selector Tabs */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-primary rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Clinical Metrics from Visit Notes</h3>
              <p className="text-xs text-zinc-500">Automatically parsed trends from consultation history</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              <button
                id="btn-view-chart-mode"
                onClick={() => setViewMode('chart')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'chart' ? "bg-white text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Line Chart
              </button>
              <button
                id="btn-view-table-mode"
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'table' ? "bg-white text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Data Points
              </button>
            </div>
            <button
              id="btn-record-visit-note"
              onClick={onRecordVisit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Visit Note
            </button>
          </div>
        </div>

        {/* Metric Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1">
          {(Object.keys(metricConfigs) as ExtractedMetricType[]).map((key) => {
            const item = metricConfigs[key];
            const ItemIcon = item.icon;
            const count = availableMetrics[key];
            const isSelected = selectedMetric === key;

            return (
              <button
                key={key}
                id={`metric-tab-${key}`}
                onClick={() => setSelectedMetric(key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border",
                  isSelected
                    ? "bg-emerald-900 text-white border-emerald-900 shadow-sm"
                    : count > 0
                    ? "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                    : "bg-zinc-50 text-zinc-400 border-zinc-100 hover:text-zinc-600"
                )}
              >
                <ItemIcon className={cn("w-3.5 h-3.5", isSelected ? "text-emerald-300" : "text-zinc-400")} />
                <span>{item.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                  isSelected
                    ? "bg-emerald-950/60 text-emerald-200"
                    : count > 0
                    ? "bg-emerald-50 text-primary"
                    : "bg-zinc-200/70 text-zinc-400"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div id="kpi-latest-reading" className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Latest Reading</span>
              <div className="p-1.5 bg-emerald-50 text-primary rounded-lg">
                <IconComponent className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-900">
              {stats.latestVal} <span className="text-xs font-semibold text-zinc-400">{config.unit}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">{stats.latestDate}</p>
          </div>

          <div id="kpi-baseline-reading" className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Baseline Recorded</span>
              <div className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-900">
              {stats.firstVal} <span className="text-xs font-semibold text-zinc-400">{config.unit}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">Initial visit ({stats.firstDate})</p>
          </div>

          <div id="kpi-net-trend-change" className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Overall Trend Change</span>
              <div className={cn(
                "p-1.5 rounded-lg",
                stats.trendDirection === 'down' ? "bg-blue-50 text-blue-600" :
                stats.trendDirection === 'up' ? "bg-amber-50 text-amber-600" :
                "bg-zinc-100 text-zinc-600"
              )}>
                {stats.trendDirection === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
                 stats.trendDirection === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> :
                 <Minus className="w-3.5 h-3.5" />}
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-900">{stats.changeDisplay}</div>
            <p className="text-[11px] text-zinc-400 mt-1">Across all consultation notes</p>
          </div>

          <div id="kpi-data-points" className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Notes Analyzed</span>
              <div className="p-1.5 bg-emerald-50 text-primary rounded-lg">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-900">{stats.count}</div>
            <p className="text-[11px] text-zinc-400 mt-1">Visit notes with this metric</p>
          </div>
        </div>
      )}

      {/* Main Recharts Graph or Empty State */}
      {currentChartData.length === 0 ? (
        <div id="visit-metrics-empty-state" className="bg-white border border-zinc-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <IconComponent className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">
            No {config.label} Found in Past Visit Notes
          </h3>
          <p className="text-zinc-500 text-xs sm:text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            Our smart clinical parser automatically reads your visit consultation notes to plot this timeline graph.
            Simply include measurements like <span className="font-bold text-zinc-700">"BP: 120/80"</span>, <span className="font-bold text-zinc-700">"Weight: 72kg"</span>, or <span className="font-bold text-zinc-700">"Pulse: 72 bpm"</span> in any visit note.
          </p>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 max-w-md mx-auto mb-6 text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Examples to write in visit notes:</span>
            </div>
            <ul className="text-xs text-zinc-600 space-y-1.5 font-mono">
              <li className="bg-white px-2.5 py-1.5 rounded-lg border border-zinc-100">• "BP: 120/80, weight: 72kg, pulse: 70 bpm"</li>
              <li className="bg-white px-2.5 py-1.5 rounded-lg border border-zinc-100">• "Blood pressure 130/85. Client resting better."</li>
              <li className="bg-white px-2.5 py-1.5 rounded-lg border border-zinc-100">• "Blood sugar: 95 mg/dL, pain level: 2/10"</li>
            </ul>
          </div>

          <button
            id="btn-add-vitals-visit"
            onClick={onRecordVisit}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-emerald-800 transition-all shadow-md shadow-emerald-100"
          >
            <Plus className="w-4 h-4" />
            Record Consultation with Vitals
          </button>
        </div>
      ) : viewMode === 'chart' ? (
        <div id="visit-metrics-chart-card" className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-zinc-900">{config.label} Trend Over Time</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-primary rounded-full border border-emerald-100">
                  {config.unit}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{config.description}</p>
            </div>

            {/* Reference info */}
            {selectedMetric === 'bloodPressure' && (
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-zinc-600">Systolic (Top)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-zinc-600">Diastolic (Bottom)</span>
                </div>
              </div>
            )}
          </div>

          {/* Recharts LineChart */}
          <div id="recharts-visit-metrics-container" className="h-[300px] sm:h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="shortDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#71717a', fontWeight: 600 }}
                  dy={8}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#71717a', fontWeight: 600 }}
                  domain={['auto', 'auto']}
                  dx={-4}
                  unit={selectedMetric !== 'bloodPressure' ? ` ${config.unit}` : ''}
                />
                
                {/* Clinical reference lines */}
                {selectedMetric === 'bloodPressure' && (
                  <>
                    <ReferenceLine y={120} stroke="#059669" strokeDasharray="3 3" strokeOpacity={0.4} />
                    <ReferenceLine y={80} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.4} />
                  </>
                )}
                {selectedMetric === 'heartRate' && (
                  <>
                    <ReferenceLine y={60} stroke="#71717a" strokeDasharray="3 3" strokeOpacity={0.3} />
                    <ReferenceLine y={100} stroke="#71717a" strokeDasharray="3 3" strokeOpacity={0.3} />
                  </>
                )}
                {selectedMetric === 'bloodSugar' && (
                  <ReferenceLine y={100} stroke="#d97706" strokeDasharray="3 3" strokeOpacity={0.4} />
                )}

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const dataPoint = payload[0].payload as ExtractedDataPoint;

                    return (
                      <div className="bg-white/95 backdrop-blur-md border border-zinc-200 rounded-2xl p-4 shadow-xl text-xs max-w-xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                          <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {dataPoint.formattedDate}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {formatDistanceToNow(dataPoint.date, { addSuffix: true })}
                          </span>
                        </div>

                        {/* Values */}
                        <div className="space-y-1">
                          {selectedMetric === 'bloodPressure' ? (
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-zinc-600">Blood Pressure:</span>
                              <span className="text-primary text-sm font-black">
                                {dataPoint.systolic}/{dataPoint.diastolic} mmHg
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-zinc-600">{config.label}:</span>
                              <span className="text-primary text-sm font-black">
                                {payload[0].value} {config.unit}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Active Supplements on this visit */}
                        {dataPoint.supplements.length > 0 && (
                          <div className="pt-1.5 border-t border-zinc-100">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                              Prescribed Regimen:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {dataPoint.supplements.map(s => (
                                <span key={s} className="px-1.5 py-0.5 bg-emerald-50 text-primary rounded-md text-[10px] font-semibold border border-emerald-100">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Note excerpt */}
                        {dataPoint.notes && (
                          <div className="pt-1.5 border-t border-zinc-100">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                              Consultation Note Excerpt:
                            </span>
                            <p className="text-[11px] text-zinc-600 italic bg-zinc-50 p-2 rounded-lg leading-relaxed line-clamp-3">
                              "{dataPoint.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {selectedMetric === 'bloodPressure' ? (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="systolic" 
                      name="Systolic"
                      stroke="#059669" 
                      strokeWidth={3} 
                      dot={{ fill: '#059669', strokeWidth: 2, r: 4, stroke: '#fff' }} 
                      activeDot={{ r: 7, stroke: '#059669', strokeWidth: 0 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="diastolic" 
                      name="Diastolic"
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#fff' }} 
                      activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 0 }}
                    />
                  </>
                ) : (
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    name={config.label}
                    stroke={config.color} 
                    strokeWidth={3} 
                    dot={{ fill: config.color, strokeWidth: 2, r: 4, stroke: '#fff' }} 
                    activeDot={{ r: 7, stroke: config.color, strokeWidth: 0 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Data Points Table Mode */
        <div id="visit-metrics-table-card" className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-900">Extracted {config.label} Data Points</h4>
            <span className="text-xs text-zinc-400 font-medium">Sorted chronologically</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {currentChartData.map((dp) => (
              <div key={dp.visitId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/70 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-zinc-900">{dp.formattedDate}</span>
                    <span className="text-[11px] text-zinc-400">({formatDistanceToNow(dp.date, { addSuffix: true })})</span>
                  </div>
                  <p className="text-xs text-zinc-600 italic bg-zinc-50 p-2 rounded-lg border border-zinc-200/60 max-w-xl">
                    "{dp.notes}"
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Extracted Value</span>
                    <span className="text-base font-black text-primary">
                      {selectedMetric === 'bloodPressure' ? `${dp.systolic}/${dp.diastolic}` : 
                       selectedMetric === 'weight' ? dp.weight :
                       selectedMetric === 'heartRate' ? dp.heartRate :
                       selectedMetric === 'bloodSugar' ? dp.bloodSugar :
                       selectedMetric === 'temperature' ? dp.temperature :
                       dp.painScore} <span className="text-xs font-semibold text-zinc-500">{config.unit}</span>
                    </span>
                  </div>

                  {onEditVisit && (
                    <button
                      onClick={() => {
                        const target = visits.find(v => v.id === dp.visitId);
                        if (target) onEditVisit(target);
                      }}
                      className="p-2 text-zinc-400 hover:text-primary hover:bg-emerald-50 rounded-lg transition-all"
                      title="Edit this visit note"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes Format Reference Guide */}
      <div id="visit-metrics-syntax-guide" className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 text-primary rounded-xl shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-emerald-950">How Visit Notes Are Converted to Trends</h5>
            <p className="text-xs text-emerald-800/80 leading-relaxed mt-0.5">
              Whenever you log or edit a consultation, include keywords like <span className="font-semibold text-emerald-950">BP: 120/80</span>, <span className="font-semibold text-emerald-950">Weight: 72kg</span>, or <span className="font-semibold text-emerald-950">Pulse: 72</span> in the notes field. Recharts automatically graphs them over time.
            </p>
          </div>
        </div>

        <button
          onClick={onRecordVisit}
          className="shrink-0 text-xs font-bold px-3 py-2 bg-white text-emerald-900 border border-emerald-200 rounded-xl hover:bg-emerald-100/50 transition-colors"
        >
          Add Vitals to Visit
        </button>
      </div>
    </div>
  );
};

export default VisitMetricsTrends;
