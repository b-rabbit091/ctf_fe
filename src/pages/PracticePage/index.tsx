    import React, {useEffect, useState} from "react";
    import {useParams} from "react-router-dom";
    import Navbar from "../../components/Navbar";
    import PracticeDescription from "./PracticeDescription";
    import PreviousSubmissions from "./PreviousSubmissions";
    import RightPane from "./RightPane";
    import {getChallengeById} from "../../api/practice";
    import {Challenge} from "./types";


    const PracticePage: React.FC = () => {
        const {id} = useParams<{ id: string }>();
        const [challenge, setChallenge] = useState<Challenge | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");

        useEffect(() => {
            const fetchChallenge = async () => {
                try {
                    const data = await getChallengeById(Number(id));
                    setChallenge(data);
                } catch (err) {
                    console.error(err);
                    setError("Failed to load challenge.");
                } finally {
                    setLoading(false);
                }
            };
            fetchChallenge();
        }, [id]);

        if (loading) return <p className="p-6 text-gray-500">Loading challenge...</p>;
        if (error || !challenge) return <p className="p-6 text-red-500">{error}</p>;

        return (
            <div className="min-h-screen bg-[#f5f5f5] text-sm font-sans">
                <Navbar/>

                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-4">
                    {/* Left Pane */}
                    <div className="flex-1 bg-white border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                className={`px-6 py-3 font-medium ${activeTab === "description"
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-500 hover:text-gray-700"} `}
                                onClick={() => setActiveTab("description")}
                            >
                                Description
                            </button>
                            <button
                                className={`ml-4 px-6 py-3 font-medium ${activeTab === "submissions"
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-500 hover:text-gray-700"} `}
                                onClick={() => setActiveTab("submissions")}
                            >
                                Previous Submissions
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-1 overflow-y-auto">
                            {activeTab === "description" && <PracticeDescription challenge={challenge} />}
                            {activeTab === "submissions" && <PreviousSubmissions challengeId={challenge.id}/>}
                        </div>
                    </div>

                    {/* Right Pane */}
                    <div className="w-full lg:w-96 sticky top-4">
                        <RightPane challenge={challenge}/>
                    </div>
                </div>
            </div>
        );
    };

    export default PracticePage;
