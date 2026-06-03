import { useParams } from "react-router-dom"
import InventorySection from "./InventorySection"

const CourseInventoryPage = () => {
  const { courseCode } = useParams()

  // Convert course code from URL to a known track (e.g., ELCEIM... -> eim)
  const raw = courseCode || ''
  const lower = raw.toLowerCase()
  let track = lower
  if (lower.includes('eim')) track = 'eim'
  else if (lower.includes('smaw')) track = 'smaw'
  else if (lower.includes('css')) track = 'css'

  // Create title/description from the raw course code (uppercased)
  const title = `${raw?.toUpperCase()} Inventory`
  const description = `${raw?.toUpperCase()} consumables and tools.`

  return (
    <InventorySection
      title={title}
      description={description}
      track={track}
    />
  )
}

export default CourseInventoryPage
