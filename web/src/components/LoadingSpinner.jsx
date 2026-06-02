export default function LoadingSpinner({ fullScreen }) {
  if (fullScreen) {
    return (
      <div className="spinner-fullscreen">
        <div className="spinner spinner-lg" />
      </div>
    )
  }
  return <div className="spinner" />
}
