import { createContext, useContext, useState } from 'react'

const InventoryLocationContext = createContext()

export const InventoryLocationProvider = ({ children }) => {
  const [selectedInventory, setSelectedInventory] = useState('main')

  const handleInventoryChange = (inventory) => {
    setSelectedInventory(inventory)
  }

  return (
    <InventoryLocationContext.Provider value={{ selectedInventory, handleInventoryChange }}>
      {children}
    </InventoryLocationContext.Provider>
  )
}

export const useInventoryLocation = () => {
  const context = useContext(InventoryLocationContext)
  if (!context) {
    throw new Error('useInventoryLocation must be used within InventoryLocationProvider')
  }
  return context
}
