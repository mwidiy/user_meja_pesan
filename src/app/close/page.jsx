import CloseContent from './CloseContent';

// Enforce mobile fullscreen & disable zoom (Server Side Export)
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export default function ClosePage() {
    return <CloseContent />;
}
