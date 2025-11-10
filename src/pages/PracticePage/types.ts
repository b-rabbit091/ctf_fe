export interface FileType {
    name: string;
    url: string;
    type?: string;
}

export interface SolutionTypes{
    id: number;
    type: string;
    description: string;
}

export interface CategoryTypes{
    id: number;
    name: string;
    description: string;
}

export interface DifficultyTypes{
    id: number;
    level: string;
    description: string;

}
export interface Challenge {
    id: number;
    title: string;
    description: string;
    constraints?: any;
    input_format?: any;
    output_format?: any;
    sample_input?: any;
    sample_output?: any;
    files?: FileType[] | null;
    category: CategoryTypes;
    difficulty: DifficultyTypes;
    solution_type: SolutionTypes
}


export interface PreviousSubmission {
    value: string;
    updated_at: string;
    id: number;
    type: "Procedure" | "Flag";
    content: string;
    created_at: string;
    status: string;
}
