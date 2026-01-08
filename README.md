# Kufayeka Visual Designer

A powerful, extensible visual design tool built with Next.js and TypeScript for creating interactive SVG-based user interfaces with real-time MQTT event publishing capabilities.

## 🚀 Features

### Core Design Features
- **Visual Canvas**: Interactive SVG-based design canvas with grid snapping
- **Element Management**: Create, select, move, resize, rotate, and delete elements
- **Built-in Shapes**: Rectangles, circles, lines, images, text, and freehand drawing
- **Transform Tools**: Rotation, flipping, opacity, stroke/fill customization
- **Layer Management**: Z-index control, grouping, and element hierarchy
- **Clipboard Operations**: Copy, paste, duplicate elements with offset positioning

### Custom Elements & Plugins
- **Plugin Architecture**: Extensible system for custom elements and tools
- **Custom Components**: Build reusable visual components (e.g., Numeric Display)
- **Element Actions**: Define custom actions for elements via plugins
- **Dynamic Rendering**: Custom SVG rendering with real-time updates

### Event System & MQTT Integration
- **Event Listeners**: Mouse hover, click, and leave events for all elements
- **MQTT Publishing**: Real-time event publishing to configurable MQTT topics
- **Event Configuration**: Per-element event listener toggles and topic settings
- **Mock MQTT Client**: Built-in mock implementation for testing and development

### User Interface
- **Properties Panel**: Comprehensive property editor for selected elements
- **Ribbon Toolbar**: Quick access to tools, clipboard operations, and view controls
- **Palette Panel**: Element library with categorized components
- **Responsive Design**: Modern UI with Tailwind CSS styling

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd kufayekavis

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the designer.

### Build for Production
```bash
npm run build
npm start
```

## 🎨 Using the Designer

### Basic Operations

#### Creating Elements
1. Select an element from the **Palette Panel** (left sidebar)
2. Click on the canvas to place the element
3. Use the **Properties Panel** (right sidebar) to customize

#### Selecting & Transforming
- **Click** an element to select it
- **Drag** to move selected elements
- **Resize** using the corner/side handles
- **Rotate** using the rotation handle above the element
- **Multi-select** with Ctrl+Click or Shift+Click

#### Canvas Controls
- **Zoom**: Mouse wheel or +/- buttons in ribbon
- **Pan**: Drag empty canvas area
- **Grid**: Toggle grid visibility and snapping in properties panel

### Element Properties

Each element has standard properties:
- **Position**: X, Y coordinates
- **Size**: Width, Height
- **Transform**: Rotation, flip horizontal/vertical
- **Appearance**: Fill color, stroke color, stroke width, opacity
- **Event Listeners**: Enable/disable mouse events
- **MQTT Topic**: Configure event publishing destination

## 🔌 Plugin System Tutorial

The Kufayeka Visual Designer features a powerful plugin architecture that allows you to extend functionality with custom elements, tools, and behaviors.

### Plugin Architecture Overview

```
src/
├── designer/
│   ├── core/
│   │   ├── plugins.ts          # Plugin registry
│   │   ├── elements.ts         # Element definitions
│   │   └── registry.ts         # Plugin registration
│   └── plugins/                # Plugin implementations
└── elements/                   # Custom element definitions
```

### Creating a Custom Element Plugin

#### 1. Define the Element

Create a new file in `src/elements/your-element/`

```typescript
// your-element.definition.ts
import type { ElementDefinition } from "../../designer/core/elements";
import type { DesignerAPI } from "../../designer/core/api";

export const YOUR_ELEMENT_KIND = "yourElement" as const;

export const yourElementDefinition: ElementDefinition = {
  id: `custom:${YOUR_ELEMENT_KIND}`,
  type: "custom",
  kind: YOUR_ELEMENT_KIND,
  label: "Your Custom Element",
  palette: { label: "Your Element", order: 100 },

  createInput: (pt) => ({
    type: "custom",
    kind: YOUR_ELEMENT_KIND,
    x: pt.x,
    y: pt.y,
    width: 200,
    height: 100,
    enableOnMouseHoverEventListener: false,
    enableOnMouseClickEventListener: false,
    enableOnMouseLeaveEventListener: false,
    mqttTopic: "",
    props: {
      customProperty: "default value",
    },
  }),

  render: (ctx) => {
    // Custom rendering logic
    const { element } = ctx as { element: any };
    return (
      <g>
        <rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          fill="lightblue"
          stroke="blue"
        />
        <text x={10} y={30} fontSize={16}>
          {element.props.customProperty}
        </text>
      </g>
    );
  },

  actions: {
    updateCustomProperty: (ctx, newValue) => {
      const { api, element } = ctx as { api: DesignerAPI; element: any };
      api.updateCustomProps(element.id, { customProperty: newValue });
    },
  },
};
```

#### 2. Create Render Function

```typescript
// your-element.render.ts
import type { DesignerElement } from "../../designer/core/types";

export function renderYourElement(element: DesignerElement) {
  const customEl = element as any; // Cast to access custom props

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={customEl.width}
        height={customEl.height}
        fill="lightblue"
        stroke="blue"
        strokeWidth={2}
      />
      <text
        x={customEl.width / 2}
        y={customEl.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={16}
        fill="darkblue"
      >
        {customEl.props.customProperty || "Custom Element"}
      </text>
    </g>
  );
}
```

#### 3. Register the Element

Update `src/designer/core/builtins/index.ts`:

```typescript
import { yourElementDefinition } from "../../../elements/your-element/your-element.definition";

export function registerBuiltInElements(registry: ElementRegistry) {
  // ... existing registrations

  registry.register(yourElementDefinition);
}
```

#### 4. Add Properties Panel Support

Update `src/designer/ui/components/PropertiesPanel.tsx` in the custom element case:

```typescript
if (el.type === "custom") {
  const c = el as CustomElement;

  // Handle your custom element specifically
  if (c.kind === YOUR_ELEMENT_KIND) {
    return (
      <div className="grid grid-cols-2 gap-2 items-center">
        {/* Basic properties */}
        <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, c.x, (v) => engine.updateElement(el.id, { x: v }))} />
        <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, c.y, (v) => engine.updateElement(el.id, { y: v }))} />
        <Row id={`${baseId}-w`} label="Width" control={numberInput(`${baseId}-w`, c.width, (v) => engine.updateElement(el.id, { width: Math.max(1, v) }))} />
        <Row id={`${baseId}-h`} label="Height" control={numberInput(`${baseId}-h`, c.height, (v) => engine.updateElement(el.id, { height: Math.max(1, v) }))} />

        {/* Custom properties */}
        <Row
          id={`${baseId}-custom-prop`}
          label="Custom Property"
          control={textInput(`${baseId}-custom-prop`, c.props.customProperty, (v) => {
            const newProps = { ...c.props, customProperty: v };
            engine.updateElement(el.id, { props: newProps });
          })}
        />

        {/* Event listeners and MQTT */}
        {common}
      </div>
    );
  }

  // Generic custom element handling
  // ... existing code
}
```

### Creating Ribbon Plugins

Add custom buttons to the ribbon toolbar:

```typescript
// In your plugin file
import type { RibbonAction } from "../../core/registry";

export const customRibbonActions: RibbonAction[] = [
  {
    id: "custom-action",
    label: "Custom Action",
    onClick: () => {
      console.log("Custom action triggered!");
    },
    disabled: false,
  },
];
```

Register in `src/designer/core/registry.ts`:

```typescript
// Add to plugin registration
registry.registerRibbonActions(customRibbonActions);
```

### Event Publishing with MQTT

Elements can publish events to MQTT topics when listeners are enabled:

```typescript
// In element properties
{
  enableOnMouseClickEventListener: true,
  mqttTopic: "myapp/elements/clicks"
}
```

When clicked, publishes:
```json
{
  "eventType": "onClick",
  "sourceElement": "element-id-123"
}
```

### Real MQTT Implementation

Replace the mock in `src/designer/core/api.ts`:

```typescript
publishEvent: (topic, data) => {
  // Real MQTT implementation
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, JSON.stringify(data));
  } else {
    console.warn("MQTT client not connected");
  }
},
```

## 🏗️ Architecture

### Core Components

- **Engine**: Central state management and business logic
- **Elements**: Element definitions and rendering
- **API**: Public interface for plugins and UI
- **Host**: Application container and service provider
- **UI Components**: React components for the interface

### Data Flow

```
User Interaction → UI Components → API → Engine → State Update → UI Re-render
                                      ↓
                               Plugin Actions → MQTT Publish
```

### State Management

The designer uses a centralized state pattern:
- Single source of truth in `DesignerEngine`
- Immutable state updates
- Reactive UI updates via subscriptions

## 🔧 Development

### Project Structure

```
src/
├── app/                    # Next.js app router
├── designer/
│   ├── core/              # Core engine and types
│   ├── plugins/           # Plugin implementations
│   └── ui/                # React UI components
└── elements/              # Custom element definitions
```

### Key Files

- `src/designer/core/engine.ts` - Main state and logic
- `src/designer/core/api.ts` - Public API interface
- `src/designer/ui/components/SvgCanvas.tsx` - Canvas rendering
- `src/designer/ui/components/PropertiesPanel.tsx` - Property editor

### Adding New Features

1. Define types in `core/types.ts`
2. Implement logic in `core/engine.ts`
3. Add API methods in `core/api.ts`
4. Create UI components in `ui/components/`
5. Register in appropriate registries

## 📝 API Reference

### DesignerAPI

```typescript
interface DesignerAPI {
  // State
  getState(): DesignerState;
  subscribe(listener: () => void): () => void;

  // Tools
  setTool(tool: ToolType): void;
  setViewMode(viewMode: boolean): void;

  // Selection
  select(ids: ElementId[], opts?: { append?: boolean }): void;
  clearSelection(): void;

  // Elements
  createElement(input: CreateElementInput): ElementId;
  updateElement(id: ElementId, patch: Partial<DesignerElement>): void;
  deleteElements(ids: ElementId[]): void;

  // Custom elements
  updateCustomProps(id: ElementId, patch: Record<string, unknown>): void;
  callElementAction(id: ElementId, actionId: string, ...args: unknown[]): unknown;

  // Clipboard
  copySelection(): void;
  pasteClipboard(offset?: { dx: number; dy: number }): ElementId[];
  duplicateSelection(): ElementId[];

  // MQTT
  publishEvent(topic: string, data: Record<string, unknown>): void;
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with Next.js, React, TypeScript, and Tailwind CSS.
