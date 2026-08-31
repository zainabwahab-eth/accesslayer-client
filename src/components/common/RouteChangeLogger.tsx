import { Outlet } from 'react-router';
import { useRouteChangeLogging } from '@/hooks/useRouteChangeLogging';

/** Runs route telemetry from inside the router context. */
export default function RouteChangeLogger() {
	useRouteChangeLogging();
	return <Outlet />;
}
