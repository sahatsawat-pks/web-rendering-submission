import { 
  Code, Code2, Database, Terminal, Smartphone, Layers, 
  BarChart3, Server, Globe, BookOpen, Cpu, Binary, FileJson, Monitor,
  Blocks, Workflow, Network, Laptop, Component, Layout, Box, AppWindow, Braces,
  Presentation, Play, Shield, Key, ClipboardList
} from "lucide-react"

// Map of icon names to components
export const ICON_MAP: Record<string, any> = {
  'Code': Code,
  'Code2': Code2,
  'Database': Database,
  'Terminal': Terminal,
  'Smartphone': Smartphone,
  'Layers': Layers,
  'BarChart3': BarChart3,
  'Server': Server,
  'Globe': Globe,
  'BookOpen': BookOpen,
  'Cpu': Cpu,
  'Binary': Binary,
  'FileJson': FileJson,
  'Monitor': Monitor,
  'Blocks': Blocks,
  'Workflow': Workflow,
  'Network': Network,
  'Laptop': Laptop,
  'Component': Component,
  'Layout': Layout,
  'Box': Box,
  'AppWindow': AppWindow,
  'Braces': Braces,
  'Presentation': Presentation,
  'Play': Play,
  'Shield': Shield,
  'Key': Key,
  'ClipboardList': ClipboardList
}

/**
 * Get an icon component by its string name
 * Returns Code2 icon if name is not found
 */
export function getIconByName(name: string): any {
  return ICON_MAP[name] || Code2
}
