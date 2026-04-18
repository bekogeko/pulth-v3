"use client"

import {useDeferredValue, useEffect, useMemo, useState} from "react"
import {XIcon} from "lucide-react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    PaginationState,
    useReactTable,
} from "@tanstack/react-table"

import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Input} from "@/components/ui/input"
import {Skeleton} from "@/components/ui/skeleton"
import {Select} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type Concept = {
    id: number;
    name: string;
}

type ConceptFilterMode = "and" | "or"

interface DataTableProps<TData extends { concepts: Concept[] }, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export function DataTable<TData extends { concepts: Concept[] }, TValue>({
                                                                             columns,
                                                                             data,
                                                                         }: DataTableProps<TData, TValue>) {
    const [selectedConceptIds, setSelectedConceptIds] = useState<number[]>([])
    const [conceptFilterMode, setConceptFilterMode] = useState<ConceptFilterMode>("or")
    const [conceptQuery, setConceptQuery] = useState("")
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    })

    const deferredSelectedConceptIds = useDeferredValue(selectedConceptIds)
    const deferredConceptFilterMode = useDeferredValue(conceptFilterMode)
    const deferredConceptQuery = useDeferredValue(conceptQuery)

    const conceptOptions = useMemo(() => {
        const conceptsById = new Map<number, Concept>()

        for (const row of data) {
            for (const concept of row.concepts) {
                conceptsById.set(concept.id, concept)
            }
        }

        return [...conceptsById.values()].sort((left, right) => left.name.localeCompare(right.name))
    }, [data])

    const selectedConceptIdSet = useMemo(
        () => new Set(selectedConceptIds),
        [selectedConceptIds]
    )

    const rowsWithConceptIdSets = useMemo(() => (
        data.map((row) => ({
            row,
            conceptIdSet: new Set(row.concepts.map((concept) => concept.id)),
        }))
    ), [data])

    const filteredData = useMemo(() => {
        if (!deferredSelectedConceptIds.length) {
            return data
        }

        return rowsWithConceptIdSets
            .filter(({conceptIdSet}) => {
                if (deferredConceptFilterMode === "and") {
                    return deferredSelectedConceptIds.every((conceptId) => conceptIdSet.has(conceptId))
                }

                return deferredSelectedConceptIds.some((conceptId) => conceptIdSet.has(conceptId))
            })
            .map(({row}) => row)
    }, [data, deferredConceptFilterMode, deferredSelectedConceptIds, rowsWithConceptIdSets])

    const selectedConcepts = useMemo(
        () => conceptOptions.filter((concept) => selectedConceptIdSet.has(concept.id)),
        [conceptOptions, selectedConceptIdSet]
    )

    const normalizedConceptQuery = deferredConceptQuery.trim().toLowerCase()
    const filteredConceptOptions = useMemo(() => (
        conceptOptions.filter((concept) => concept.name.toLowerCase().includes(normalizedConceptQuery))
    ), [conceptOptions, normalizedConceptQuery])

    useEffect(() => {
        setPagination((currentPagination) => (
            currentPagination.pageIndex === 0
                ? currentPagination
                : {...currentPagination, pageIndex: 0}
        ))
    }, [deferredConceptFilterMode, deferredSelectedConceptIds])

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            pagination,
        },
        onPaginationChange: setPagination,
    })

    const pageCount = Math.max(table.getPageCount(), 1)
    const visibleRowCount = filteredData.length
    const totalRowCount = data.length

    function toggleConceptFilter(conceptId: number) {
        setSelectedConceptIds((currentConceptIds) => {
            if (currentConceptIds.includes(conceptId)) {
                return currentConceptIds.filter((currentConceptId) => currentConceptId !== conceptId)
            }

            return [...currentConceptIds, conceptId]
        })
    }

    function clearConceptFilters() {
        setSelectedConceptIds([])
        setConceptQuery("")
    }

    return (
        <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="border-b bg-muted/10 px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="w-full sm:w-48">
                            <Select
                                value={conceptFilterMode}
                                onChange={(event) => setConceptFilterMode(event.target.value as ConceptFilterMode)}
                                aria-label="Concept filter mode"
                                className="h-8 rounded-lg text-xs"
                            >
                                <option value="or">Match any selected concept (OR)</option>
                                <option value="and">Match all selected concepts (AND)</option>
                            </Select>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between rounded-lg sm:w-auto"
                                    disabled={!conceptOptions.length}
                                >
                                    {selectedConceptIds.length
                                        ? `${selectedConceptIds.length} concept filter${selectedConceptIds.length === 1 ? "" : "s"}`
                                        : "Filter concepts"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-80 min-w-80">
                                <div className="p-1">
                                    <Input
                                        value={conceptQuery}
                                        onChange={(event) => setConceptQuery(event.target.value)}
                                        onKeyDown={(event) => event.stopPropagation()}
                                        placeholder="Search concepts..."
                                        aria-label="Search concepts"
                                        className="h-8 rounded-md"
                                    />
                                </div>
                                <DropdownMenuSeparator/>
                                <DropdownMenuLabel>
                                    {filteredConceptOptions.length ? "Select concept filters" : "No matching concepts"}
                                </DropdownMenuLabel>
                                <div className="max-h-64 overflow-y-auto p-1">
                                    {filteredConceptOptions.map((concept) => (
                                        <DropdownMenuCheckboxItem
                                            key={concept.id}
                                            checked={selectedConceptIds.includes(concept.id)}
                                            onCheckedChange={() => toggleConceptFilter(concept.id)}
                                            onSelect={(event) => event.preventDefault()}
                                        >
                                            {concept.name}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    {!filteredConceptOptions.length ? (
                                        <p className="px-2 py-1 text-xs text-muted-foreground">
                                            No concepts match your search.
                                        </p>
                                    ) : null}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {selectedConceptIds.length ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearConceptFilters}
                                className="rounded-lg"
                            >
                                Clear filters
                            </Button>
                        ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Showing {visibleRowCount} of {totalRowCount} questions
                    </p>
                </div>
                {selectedConcepts.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {selectedConcepts.map((concept) => (
                            <span
                                key={concept.id}
                                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] leading-none text-foreground"
                            >
                                {concept.name}
                                <button
                                    type="button"
                                    onClick={() => toggleConceptFilter(concept.id)}
                                    aria-label={`Remove ${concept.name} concept filter`}
                                    className="rounded-sm opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                >
                                    <XIcon className="size-3"/>
                                </button>
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                {selectedConceptIds.length
                                    ? "No questions match the selected concept filters."
                                    : "No results."}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {pageCount}
                </p>
                <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                    <Button
                        variant="outline"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="min-w-24 flex-1 rounded-lg sm:flex-none"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="min-w-24 flex-1 rounded-lg sm:flex-none"
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}

export function DataTableSkeleton({
    columnCount = 6,
    rowCount = 6,
}: {
    columnCount?: number
    rowCount?: number
}) {
    return (
        <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="border-b bg-muted/10 px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <Skeleton className="h-8 w-full rounded-lg sm:w-48"/>
                        <Skeleton className="h-8 w-full rounded-lg sm:w-40"/>
                        <Skeleton className="h-8 w-28 rounded-lg"/>
                    </div>
                    <Skeleton className="h-4 w-40"/>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-24 rounded-md"/>
                    <Skeleton className="h-6 w-28 rounded-md"/>
                    <Skeleton className="h-6 w-20 rounded-md"/>
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        {Array.from({length: columnCount}).map((_, index) => (
                            <TableHead key={index}>
                                <Skeleton className="h-4 w-16"/>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({length: rowCount}).map((_, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {Array.from({length: columnCount}).map((__, columnIndex) => (
                                <TableCell key={columnIndex}>
                                    <Skeleton
                                        className={columnIndex === 0 ? "h-4 w-8" : "h-4 w-full max-w-[12rem]"}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton className="h-4 w-24"/>
                <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                    <Skeleton className="h-8 min-w-24 flex-1 rounded-lg sm:flex-none"/>
                    <Skeleton className="h-8 min-w-24 flex-1 rounded-lg sm:flex-none"/>
                </div>
            </div>
        </div>
    )
}
