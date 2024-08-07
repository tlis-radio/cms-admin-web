'use client';

import Input from '@/components/form/input';
import AreaInput from '@/components/form/area-input';
import MultiSelect, { MultiSelectData } from '@/components/form/multi-select';
import CmsApiService from '@/services/cms-api-service';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Form from '@/components/form';
import ImageInput from '@/components/form/image-input';

type ShowFormValues = {
    name: string;
    description: string;
    moderators: Array<MultiSelectData>;
    image: FileList | string | null;
};

const limit = 10;

const ShowForm: React.FC = () => {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const { register, handleSubmit, setError, setValue, control, formState: { errors } } = useForm<ShowFormValues>({
        defaultValues: { name: "", description: "", moderators: [], image: null }
    });
    const imageWatch = useWatch({ control, name: "image" });

    const { data: showData, isFetching: showIsFetching, isFetched: showIsFetched, error: showError } = useQuery(
        { queryKey: [`show-${id}`], queryFn: () => CmsApiService.Show.GetByIdAsync(id), staleTime: 0, enabled: id !== null, refetchOnMount: true, gcTime: 1 });

    const { data: usersData, isFetching: usersIsFetching, fetchNextPage: usersFetchNextPage } = useInfiniteQuery({
        queryKey: ['users'],
        initialPageParam: 1,
        queryFn: async ({ pageParam = 1 }) => CmsApiService.User.PaginationAsync(limit, pageParam),
        getNextPageParam: (lastPage) => lastPage.totalPages == lastPage.page ? undefined : lastPage.page + 1
    });

    const userOptions = useMemo<Array<MultiSelectData>>(() => {
        return usersData?.pages.map((page) =>
            page.results.map((user): MultiSelectData => { return { id: user.id, value: user.nickname ?? "" }})).flat() ?? [];
    }, [usersData]);
    
    useEffect(() => {
        if (showData) {
            setValue("name", showData.name);
            setValue("description", showData.description);
            setValue("moderators", showData.moderators.map((m) => { return { id: m.id, value: m.nickname }}));
            if (showData.profileImage)
            {
                setValue("image", showData.profileImage.url);
            }
        }
    }, [showIsFetched]);

    const updateFn = async (data: ShowFormValues) => {
        if (!id) return;

        await CmsApiService.Show.UpdateAsync(id, {
            name: data.name,
            description: data.description,
            moderatorIds: data.moderators?.map((moderator) => { return moderator.id; })
        });

        if (imageWatch && typeof imageWatch !== "string")
        {
            var response = await CmsApiService.Image.UploadShowProfileImageAsync(imageWatch[0], id);

            await CmsApiService.Show.UpdateProfileImageAsync(id, { profileImageId: response.id });
        }
    };

    const createFn = async (data: ShowFormValues): Promise<void> => {
        if (!imageWatch || typeof imageWatch == "string")
        {
            throw new Error("Image is required");
        }

        var response = await CmsApiService.Show.CreateNewAsync({
            name: data.name,
            description: data.description,
            moderatorIds: data.moderators?.map((moderator) => { return moderator.id; })
        });

        var imageResponse = await CmsApiService.Image.UploadShowProfileImageAsync(imageWatch[0], response.id);

        await CmsApiService.Show.UpdateProfileImageAsync(response.id, { profileImageId: imageResponse.id });
    };

    const deleteFn = async () => {
        if (!id) return;
  
        return CmsApiService.Show.DeleteAsync(id);
     };

    return (
        <Form
            title={id ? "Upraviť reláciu" : "Nová relácia"}
            isLoading={id !== null && showIsFetching}
            isUpdate={id !== null}
            otherServerError={showError}
            handleSubmit={handleSubmit}
            updateFn={updateFn}
            createFn={createFn}
            deleteFn={id ? deleteFn : undefined}
        >
            <Input
                label='Názov relácie'
                placeholder='Názov relácie'
                registerReturn={register("name", { required: "Relácia musí obsahovať názov." } )}
                error={errors?.name}
            />
            <AreaInput
                label='Popis relácie'
                placeholder='Popis relácie'
                registerReturn={register("description", { required: "Relácia musí obsahovať popis." })}
                error={errors?.description}
            />
            <Controller
                name="moderators"
                control={control}
                rules={{ required: "Relácia musí obsahovať minimálne jeden moderátor." }}
                render={({ field: { onChange, value } }) => (
                    <MultiSelect
                        label='Moderátori'
                        selectedOptions={value}
                        options={userOptions}
                        isLoading={usersIsFetching}
                        fetchMoreData={usersFetchNextPage}
                        error={errors?.moderators}
                        onChange={onChange}
                    />
                )}
            />
            <div className='flex flex-row justify-center'>
                <ImageInput
                    registerReturn={register("image", { validate: (x) => x === null ? "Relácia musí obsahovať obrázok" : true })}
                    watch={imageWatch}
                    error={errors?.image}
                />
            </div>
        </Form>
    );
};
  
export default withPageAuthRequired(ShowForm);