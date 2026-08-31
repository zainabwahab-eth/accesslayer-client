import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type Course,
	type GetCoursesParams,
} from '@/services/course.service';
import showToast from '@/utils/toast.util';

export const DEMO_CREATOR: Course = {
	id: '1',
	title: 'Lena Markov',
	description:
		'Digital artist and illustrator. Drops exclusive prints and behind-the-scenes content for key holders.',
	price: 12.4,
	priceStroops: 124_000_000,
	creatorShareSupply: 214,
	instructorId: 'lenamarkov',
	socialHandle: 'lenamarkov',
	category: 'Art',
	level: 'INTERMEDIATE',
	isVerified: true,
	change24h: 8.2,
	volume24h: 3.1,
	creatorFeeBps: 500,
	protocolFeeBps: 250,
	priceHistory: [82_000_000, 91_000_000, 98_000_000, 110_000_000, 124_000_000],
};

export function useCreatorList(params?: GetCoursesParams) {
	return useQuery({
		queryKey: queryKeys.creators.list(params),
		queryFn: async () => [],
	});
}

export function useCreatorDetail(id: string) {
	return useQuery({
		queryKey: queryKeys.creators.detail(id),
		queryFn: async () => {
			try {
				return await courseService.getCourse(id);
			} catch (error) {
				if (id === DEMO_CREATOR.id) return DEMO_CREATOR;
				throw error;
			}
		},
		enabled: !!id,
	});
}

export function useSetCoCreator(courseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ address, splitBps }: { address: string; splitBps: number }) =>
			courseService.setCoCreator(courseId, address, splitBps),
		onSuccess: (updatedCourse: Course) => {
			if (updatedCourse) {
				queryClient.setQueryData(
					queryKeys.creators.detail(courseId),
					updatedCourse
				);
			}
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(courseId),
			});
			showToast.success('Co-creator configured successfully');
		},
		onError: (error: unknown) => {
			const message =
				error instanceof Error ? error.message : 'Failed to set co-creator';
			showToast.error(message);
		},
	});
}

