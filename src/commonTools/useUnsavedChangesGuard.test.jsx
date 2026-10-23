import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import useUnsavedChangesGuard from "./useUnsavedChangesGuard";

const Editor = ({ dirty }) => {
    const navigate = useNavigate();
    const { guardDialog, leaveWithoutPrompt } = useUnsavedChangesGuard(dirty);
    return (
        <div>
            <h1>Editor</h1>
            <Link to="/list">Back to list</Link>
            <button onClick={() => navigate("/list")}>Navigate</button>
            <button onClick={() => leaveWithoutPrompt(() => navigate("/list"))}>Saved, move on</button>
            {guardDialog}
        </div>
    );
};

const renderAt = (dirty) => render(
    <MemoryRouter initialEntries={["/edit"]}>
        <Routes>
            <Route path="/edit" element={<Editor dirty={dirty} />} />
            <Route path="/list" element={<h1>List</h1>} />
        </Routes>
    </MemoryRouter>
);

describe("useUnsavedChangesGuard", () => {
    it("lets a clean page go without asking", () => {
        renderAt(false);
        fireEvent.click(screen.getByText("Back to list"));
        expect(screen.getByRole("heading", { name: "List" })).toBeInTheDocument();
    });

    it("stops a link on a dirty page and stays when asked to", () => {
        renderAt(true);
        fireEvent.click(screen.getByText("Back to list"));
        expect(screen.getByText("Leave without saving?")).toBeInTheDocument();
        expect(screen.getByText("Editor", { selector: "h1" })).toBeInTheDocument();

        fireEvent.click(screen.getByText("Stay on page"));
        expect(screen.getByText("Editor", { selector: "h1" })).toBeInTheDocument();
    });

    it("stops navigate() on a dirty page and goes on when the user chooses to leave", () => {
        renderAt(true);
        fireEvent.click(screen.getByText("Navigate"));
        fireEvent.click(screen.getByText("Leave without saving"));
        expect(screen.getByRole("heading", { name: "List" })).toBeInTheDocument();
    });

    it("lets the page move on after a save without asking", () => {
        renderAt(true);
        fireEvent.click(screen.getByText("Saved, move on"));
        expect(screen.queryByText("Leave without saving?")).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "List" })).toBeInTheDocument();
    });
});
