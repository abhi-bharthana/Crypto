import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

export const Tabs = ({ 
  defaultValue, 
  value, 
  onValueChange, 
  children,
  className
}: { 
  defaultValue?: string; 
  value?: string; 
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabsList = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("flex p-1 space-x-1 bg-black/40 rounded-lg backdrop-blur-md border border-white/5", className)}>
    {children}
  </div>
)

export const TabsTrigger = ({ value, children, className }: { value: string, children: React.ReactNode, className?: string }) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")
  
  const isSelected = context.value === value

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        "relative flex-1 inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors outline-none",
        isSelected ? "text-white" : "text-white/50 hover:text-white/80",
        className
      )}
    >
      {isSelected && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-white/10 rounded-md border border-white/10"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}

export const TabsContent = ({ value, children, className }: { value: string, children: React.ReactNode, className?: string }) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")
  
  if (context.value !== value) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
      className={cn("mt-4", className)}
    >
      {children}
    </motion.div>
  )
}
